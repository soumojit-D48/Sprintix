import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { generateText } from 'ai'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { model, checkAiRateLimit } from '@/lib/ai'
import {
  summarizeIssueSchema,
  suggestAssigneeSchema,
  suggestLabelsSchema,
  planSprintSchema,
} from '@/lib/validations/ai'

// async function ensureProPlan(workspaceId: string) {
//   const workspace = await prisma.workspace.findUnique({
//     where: { id: workspaceId },
//     select: { plan: true },
//   })
//   if (workspace?.plan !== 'PRO') {
//     throw new TRPCError({
//       code: 'FORBIDDEN',
//       message: 'UPGRADE_REQUIRED',
//     })
//   }
// }

export const aiRouter = router({
  summarizeIssue: protectedProcedure
    .input(summarizeIssueSchema)
    .mutation(async ({ ctx, input }) => {
      const issue = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: {
          project: { select: { workspaceId: true } },
          comments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
      if (!issue) throw new TRPCError({ code: 'NOT_FOUND' })

      const workspaceId = issue.project.workspaceId
      // await ensureProPlan(workspaceId)
      checkAiRateLimit(workspaceId)

      const commentsText = issue.comments
        .map((c) => `${c.author.name}: ${JSON.stringify(c.body)}`)
        .join('\n')

      const prompt = [
        `Title: ${issue.title}`,
        issue.description ? `Description: ${JSON.stringify(issue.description)}` : null,
        `Status: ${issue.status}`,
        `Priority: ${issue.priority}`,
        commentsText ? `Comments:\n${commentsText}` : null,
      ]
        .filter(Boolean)
        .join('\n\n')

      const { text } = await generateText({
        model,
        system:
          'You are a project management assistant. Given an issue with its title, description, status, priority, and comments, provide a concise 3–5 bullet summary covering: key decisions made, blockers identified, and the current status. Use bullet points prefixed with "-". Be direct and factual. Do not use markdown headers.',
        prompt,
      })

      const summary = text
        .split('\n')
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => l.replace(/^-\s*/, '').trim())
        .filter(Boolean)

      return { summary: summary.length > 0 ? summary : [text.trim()] }
    }),

  suggestAssignee: protectedProcedure
    .input(suggestAssigneeSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      const workspaceId = project.workspaceId
      // await ensureProPlan(workspaceId)
      checkAiRateLimit(workspaceId)

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: { in: ['OWNER', 'ADMIN', 'MEMBER'] } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              assignedIssues: {
                where: { deletedAt: null },
                select: { status: true, title: true },
              },
            },
          },
        },
      })

      const workloadData = members.map((m) => ({
        name: m.user.name,
        openIssues: m.user.assignedIssues.filter(
          (i) => i.status !== 'DONE' && i.status !== 'CANCELLED'
        ).length,
        recentTitles: m.user.assignedIssues
          .filter((i) => i.status === 'DONE' || i.status === 'CANCELLED')
          .slice(-10)
          .map((i) => i.title),
      }))

      const descriptionText = input.issueDescription
        ? JSON.stringify(input.issueDescription)
        : 'No description'

      const { text } = await generateText({
        model,
        system:
          'You are a project management assistant. Given a new issue and team workload data, suggest the top 3 best-fit assignees. For each suggestion, provide the member name and a brief reasoning (1 sentence). Return a JSON array of objects with keys "name" and "reasoning". Do not include any other text outside the JSON array.',
        prompt: [
          `New Issue Title: ${input.issueTitle}`,
          `New Issue Description: ${descriptionText}`,
          `Team Members:\n${JSON.stringify(workloadData, null, 2)}`,
          'Based on current workload and experience with similar issues, suggest the best assignee(s). Return ONLY valid JSON.',
        ].join('\n\n'),
      })

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return { suggestions: [] }
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]) as { name: string; reasoning: string }[]
        const suggestions = parsed.slice(0, 3).map((s) => {
          const member = members.find(
            (m) => m.user.name?.toLowerCase() === s.name.toLowerCase()
          )
          return {
            name: s.name,
            reasoning: s.reasoning,
            userId: member?.user.id ?? null,
          }
        })
        return { suggestions }
      } catch {
        return { suggestions: [] }
      }
    }),

  suggestLabels: protectedProcedure
    .input(suggestLabelsSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId
      // await ensureProPlan(workspaceId)
      checkAiRateLimit(workspaceId)

      const labels = await prisma.label.findMany({
        where: { workspaceId },
      })

      if (labels.length === 0) {
        return { suggestedLabelIds: [] }
      }

      const descriptionText = input.issueDescription
        ? JSON.stringify(input.issueDescription)
        : 'No description'

      const labelsList = labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))

      const { text } = await generateText({
        model,
        system:
          'You are a project management assistant. Given an issue title and description, select 1–3 labels from the provided list that best match the issue. Only use labels from the provided list — never invent new ones. Return a JSON array of label IDs. If no labels fit, return an empty array []. Return ONLY valid JSON, no other text.',
        prompt: [
          `Issue Title: ${input.issueTitle}`,
          `Issue Description: ${descriptionText}`,
          `Available Labels:\n${JSON.stringify(labelsList, null, 2)}`,
          'Return ONLY a JSON array of label IDs that best match this issue (1-3 IDs, or [] if none fit).',
        ].join('\n\n'),
      })

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return { suggestedLabelIds: [] }
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]) as string[]
        const validIds = new Set(labels.map((l) => l.id))
        const suggestedLabelIds = parsed.filter((id) => validIds.has(id))
        return { suggestedLabelIds }
      } catch {
        return { suggestedLabelIds: [] }
      }
    }),

  planSprint: protectedProcedure
    .input(planSprintSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true, name: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      const workspaceId = project.workspaceId
      // await ensureProPlan(workspaceId)
      checkAiRateLimit(workspaceId)

      const backlogIssues = await prisma.issue.findMany({
        where: {
          projectId: input.projectId,
          sprintId: null,
          deletedAt: null,
          status: { not: 'DONE' },
        },
        include: {
          labels: { include: { label: { select: { name: true } } } },
          assignee: { select: { name: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      })

      const pastSprints = await prisma.sprint.findMany({
        where: { projectId: input.projectId, status: 'COMPLETED' },
        include: {
          issues: {
            where: { status: 'DONE' },
            select: { id: true },
          },
        },
        orderBy: { endDate: 'desc' },
        take: 6,
      })

      const issuesData = backlogIssues.map((i) => ({
        id: i.id,
        title: i.title,
        priority: i.priority,
        labels: i.labels.map((l) => l.label.name),
        assignee: i.assignee?.name ?? null,
      }))

      const avgVelocity =
        pastSprints.length > 0
          ? Math.round(
              pastSprints.reduce((sum, s) => sum + s.issues.length, 0) / pastSprints.length
            )
          : null

      const { text } = await generateText({
        model,
        system:
          'You are a sprint planning assistant. Given a list of backlog issues and the team\'s past sprint velocity, group issues by theme, estimate relative complexity, and recommend a sprint scope. Return a JSON object with this exact shape: { "recommendedIssueIds": string[], "reasoning": string, "themes": { "name": string, "issueIds": string[], "estimatedComplexity": "low"|"medium"|"high" }[], "estimatedVelocity": number }. recommendedIssueIds should be approximately the average velocity from past sprints. If no velocity data is available, recommend 5-8 issues. Return ONLY valid JSON.',
        prompt: [
          `Project: ${project.name}`,
          `Average velocity (issues completed per past sprint): ${avgVelocity ?? 'No data — recommend 5-8 issues'}`,
          `Backlog issues (${issuesData.length} total):`,
          JSON.stringify(issuesData, null, 2),
          'Return ONLY valid JSON in the specified format.',
        ].join('\n\n'),
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          recommendedIssueIds: [],
          reasoning: 'Unable to generate sprint plan.',
          themes: [],
          estimatedVelocity: avgVelocity ?? 0,
        }
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          recommendedIssueIds: string[]
          reasoning: string
          themes: { name: string; issueIds: string[]; estimatedComplexity: string }[]
          estimatedVelocity: number
        }

        const validIds = new Set(backlogIssues.map((i) => i.id))
        return {
          recommendedIssueIds: parsed.recommendedIssueIds.filter((id) => validIds.has(id)),
          reasoning: parsed.reasoning ?? '',
          themes: (parsed.themes ?? []).map((t) => ({
            name: t.name,
            issueIds: t.issueIds.filter((id) => validIds.has(id)),
            estimatedComplexity: t.estimatedComplexity as 'low' | 'medium' | 'high',
          })),
          estimatedVelocity: parsed.estimatedVelocity ?? avgVelocity ?? 0,
        }
      } catch {
        return {
          recommendedIssueIds: [],
          reasoning: 'Unable to generate sprint plan.',
          themes: [],
          estimatedVelocity: avgVelocity ?? 0,
        }
      }
    }),
})
