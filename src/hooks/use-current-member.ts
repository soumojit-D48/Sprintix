'use client'

import { trpc } from '@/lib/trpc/provider'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null

interface CurrentMember {
  role: MemberRole
  userId: string
  memberId: string
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isViewer: boolean
  canInvite: boolean
  canManageMembers: boolean
  canManageSettings: boolean
  canDeleteWorkspace: boolean
}

export function useCurrentMember() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  // First get workspace by slug to get the ID
  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug },
    { enabled: !!workspaceSlug }
  )

  // Then get current member using workspace ID
  const {
    data: member,
    isLoading,
    error,
  } = trpc.member.getCurrentMember.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const result = useMemo((): CurrentMember => {
    if (!member) {
      return {
        role: null,
        userId: '',
        memberId: '',
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isViewer: false,
        canInvite: false,
        canManageMembers: false,
        canManageSettings: false,
        canDeleteWorkspace: false,
      }
    }

    const isOwner = member.role === 'OWNER'
    const isAdmin = member.role === 'ADMIN' || isOwner
    const isMember = member.role === 'MEMBER' || isAdmin
    const isViewer = member.role === 'VIEWER'

    return {
      role: member.role,
      userId: member.userId,
      memberId: member.id,
      isOwner,
      isAdmin,
      isMember,
      isViewer,
      canInvite: isAdmin,
      canManageMembers: isAdmin,
      canManageSettings: isAdmin,
      canDeleteWorkspace: isOwner,
    }
  }, [member])

  return {
    ...result,
    isLoading,
    error,
  }
}
