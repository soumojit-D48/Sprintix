'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/provider'

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
]

export function Step3CreateProject() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')

  const getWorkspace = trpc.workspace.getUserWorkspaces.useQuery()

  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      const workspace = getWorkspace.data?.[0]
      if (workspace) {
        router.push(`/${workspace.slug}/${project.identifier}`)
      }
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const workspace = getWorkspace.data?.[0]

  const handleNameChange = (value: string) => {
    setName(value)
    if (!identifier) {
      setIdentifier(value.substring(0, 3).toUpperCase())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !identifier.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (!workspace) {
      setError('No workspace found')
      return
    }

    setError('')
    createProject.mutate({
      workspaceId: workspace.id,
      name,
      identifier: identifier.toUpperCase(),
      color,
    })
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold">Create your first project</h2>
          <p className="mt-2 text-gray-600">Projects help you organize issues and track work.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Project"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Project Code</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="PRO"
              maxLength={10}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">Used in issue keys (e.g., PRO-123)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Color</label>
            <div className="mt-2 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ${
                    color === c ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={createProject.isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}
