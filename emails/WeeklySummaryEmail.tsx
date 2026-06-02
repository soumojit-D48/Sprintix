import { Section, Text, Heading, Hr } from '@react-email/components'
import * as React from 'react'
import EmailLayout from './components/EmailLayout'
import EmailFooter from './components/EmailFooter'

interface SprintProgress {
  name: string
  percentComplete: number
  completedIssues: number
  totalIssues: number
}

interface UpcomingDueDate {
  issueIdentifier: string
  issueTitle: string
  dueDate: string
  projectName: string
}

interface WeeklySummaryEmailProps {
  userName: string
  workspaceName: string
  sprintProgress?: SprintProgress | null
  issuesCompletedThisWeek: number
  weeklyGoal: number
  upcomingDueDates: UpcomingDueDate[]
  mostActiveMember: string
  dashboardUrl: string
}

export default function WeeklySummaryEmail({
  userName,
  workspaceName,
  sprintProgress,
  issuesCompletedThisWeek,
  weeklyGoal,
  upcomingDueDates,
  mostActiveMember,
  dashboardUrl,
}: WeeklySummaryEmailProps) {
  const goalMet = issuesCompletedThisWeek >= weeklyGoal

  return (
    <EmailLayout
      previewText={`Your weekly summary for ${workspaceName}`}
    >
      <Section>
        <Text style={greeting}>Hi {userName},</Text>
        <Text style={paragraph}>
          Here is your weekly summary for <strong>{workspaceName}</strong>.
        </Text>

        {sprintProgress && (
          <Section style={section}>
            <Heading style={sectionHeading}>Sprint Progress</Heading>
            <Section style={progressSection}>
              <Text style={progressLabel}>
                {sprintProgress.name}
              </Text>
              <Text style={progressValue}>
                {sprintProgress.percentComplete}% complete
              </Text>
              <Section style={progressBarBg}>
                <Section
                  style={{
                    ...progressBarFill,
                    width: `${sprintProgress.percentComplete}%`,
                  }}
                />
              </Section>
              <Text style={progressDetail}>
                {sprintProgress.completedIssues} of{' '}
                {sprintProgress.totalIssues} issues completed
              </Text>
            </Section>
          </Section>
        )}

        <Hr style={hr} />

        <Section style={section}>
          <Heading style={sectionHeading}>Weekly Velocity</Heading>
          <Section style={statRow}>
            <Section style={statCard}>
              <Text style={statValue}>{issuesCompletedThisWeek}</Text>
              <Text style={statLabel}>Completed</Text>
            </Section>
            <Section style={statCard}>
              <Text style={statValue}>{weeklyGoal}</Text>
              <Text style={statLabel}>Goal</Text>
            </Section>
            <Section
              style={{
                ...statCard,
                backgroundColor: goalMet ? '#f0fdf4' : '#fef2f2',
              }}
            >
              <Text
                style={{
                  ...statValue,
                  color: goalMet ? '#15803d' : '#dc2626',
                }}
              >
                {goalMet ? '✓' : '!'}
              </Text>
              <Text style={statLabel}>
                {goalMet ? 'On Track' : 'Behind'}
              </Text>
            </Section>
          </Section>
        </Section>

        {upcomingDueDates.length > 0 && (
          <>
            <Hr style={hr} />
            <Section style={section}>
              <Heading style={sectionHeading}>Upcoming Due Dates</Heading>
              {upcomingDueDates.map((item, index) => (
                <Section key={index} style={dueDateRow}>
                  <Text style={dueDateIdentifier}>
                    <strong>{item.issueIdentifier}</strong>
                  </Text>
                  <Text style={dueDateTitle}>{item.issueTitle}</Text>
                  <Text style={dueDateValue}>{item.dueDate}</Text>
                  <Text style={dueDateProject}>{item.projectName}</Text>
                </Section>
              ))}
            </Section>
          </>
        )}

        <Hr style={hr} />

        <Section style={section}>
          <Heading style={sectionHeading}>Team Highlight</Heading>
          <Text style={highlight}>
            🏆 <strong>{mostActiveMember}</strong> was the most active team
            member this week.
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <a href={dashboardUrl} style={dashboardLink}>
            View Full Dashboard →
          </a>
        </Section>
      </Section>
      <EmailFooter workspaceName={workspaceName} />
    </EmailLayout>
  )
}

const greeting = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const section = {
  marginBottom: '16px',
}

const sectionHeading = {
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: '24px',
  margin: '0 0 12px',
  color: '#1e293b',
}

const progressSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '16px',
}

const progressLabel = {
  color: '#334155',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '20px',
  margin: '0 0 4px',
}

const progressValue = {
  color: '#6366f1',
  fontSize: '28px',
  fontWeight: 700,
  lineHeight: '36px',
  margin: '0 0 8px',
}

const progressBarBg = {
  backgroundColor: '#e2e8f0',
  borderRadius: '4px',
  height: '8px',
  marginBottom: '8px',
  width: '100%',
}

const progressBarFill = {
  backgroundColor: '#6366f1',
  borderRadius: '4px',
  height: '8px',
}

const progressDetail = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const statRow = {
  display: 'flex' as const,
}

const statCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  flex: 1,
  marginRight: '8px',
  padding: '12px',
  textAlign: 'center' as const,
}

const statValue = {
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '32px',
  margin: '0 0 4px',
  color: '#1e293b',
}

const statLabel = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
}

const dueDateRow = {
  borderBottom: '1px solid #e6ebf1',
  padding: '8px 0',
}

const dueDateIdentifier = {
  color: '#6366f1',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const dueDateTitle = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const dueDateValue = {
  color: '#dc2626',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const dueDateProject = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
}

const highlight = {
  backgroundColor: '#f0f9ff',
  borderRadius: '6px',
  color: '#0369a1',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  padding: '12px 16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const dashboardLink = {
  color: '#6366f1',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
}
