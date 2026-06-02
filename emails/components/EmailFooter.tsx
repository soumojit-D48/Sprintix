import { Text, Link } from '@react-email/components'
import * as React from 'react'

interface EmailFooterProps {
  workspaceName?: string
}

export default function EmailFooter({ workspaceName }: EmailFooterProps) {
  return (
    <Text style={text}>
      You are receiving this because you are a member of{' '}
      {workspaceName ? (
        <strong>{workspaceName}</strong>
      ) : (
        'a sprintix workspace'
      )}
      .{' '}
      <Link href="https://sprintix.app/settings/notifications" style={link}>
        Manage notification preferences
      </Link>
    </Text>
  )
}

const text = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0 0',
}

const link = {
  color: '#6366f1',
  textDecoration: 'underline',
}
