'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FolderKanban,
  Plus,
  Search,
  AlertCircle,
  Calendar,
  User,
  Archive,
  MoreHorizontal,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCreateModal } from '@/components/projects/ProjectCreateModal'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ARCHIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function ProjectsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  const { data: projects, isLoading } = trpc.project.list.useQuery(
    {
      workspaceId: workspace?.id ?? '',
      ...(statusFilter !== 'ALL'
        ? { status: statusFilter as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED' }
        : {}),
    },
    { enabled: !!workspace?.id }
  )

  const filteredProjects = projects?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.identifier.toLowerCase().includes(search.toLowerCase())
  )

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {projects?.length ?? 0} project{(projects?.length ?? 0) !== 1 ? 's' : ''} in this
              workspace
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Project
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="mt-1 h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects?.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <FolderKanban className="text-muted-foreground mb-4 size-12" />
            <h3 className="mb-1 text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Create your first project to get started.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 size-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects?.map((project) => {
              const isOverdue =
                project.targetDate &&
                new Date(project.targetDate) < new Date() &&
                project.status === 'ACTIVE'

              return (
                <Link key={project.id} href={`/${workspaceSlug}/projects/${project.id}`}>
                  <Card className="h-full transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-10 items-center justify-center rounded-lg text-lg font-bold text-white"
                            style={{ backgroundColor: project.color || '#3B82F6' }}
                          >
                            {project.icon || project.identifier.charAt(0)}
                          </div>
                          <div>
                            <h3 className="leading-tight font-semibold">{project.name}</h3>
                            <p className="text-muted-foreground font-mono text-xs">
                              {project.identifier}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={statusColors[project.status] || ''}>
                          {project.status.charAt(0) + project.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {project.openIssueCount > 0
                              ? `${project.openIssueCount} open`
                              : 'No open issues'}
                          </span>
                          <span className="text-muted-foreground">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          {project.lead ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-5">
                                <AvatarImage src={project.lead.avatarUrl ?? ''} />
                                <AvatarFallback className="text-[10px]">
                                  {project.lead.name?.charAt(0) ?? 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-[100px] truncate">{project.lead.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <User className="size-3.5" />
                              <span>No lead</span>
                            </div>
                          )}
                        </div>
                        {project.targetDate && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar
                              className={`size-3.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                            />
                            <span
                              className={
                                isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                              }
                            >
                              {new Date(project.targetDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        <ProjectCreateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </main>
  )
}
