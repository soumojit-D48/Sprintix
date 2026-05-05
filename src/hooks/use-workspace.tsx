'use client'

import { createContext, useContext, ReactNode } from 'react'

interface WorkspaceContextValue {
  workspace: {
    id: string
    name: string
    slug: string
  } | null
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  children,
  workspace,
  isLoading,
}: {
  children: ReactNode
  workspace: {
    id: string
    name: string
    slug: string
  } | null
  isLoading: boolean
}) {
  return (
    <WorkspaceContext.Provider value={{ workspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
