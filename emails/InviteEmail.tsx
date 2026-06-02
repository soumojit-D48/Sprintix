import { Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import EmailLayout from './components/EmailLayout'
import EmailButton from './components/EmailButton'
import EmailFooter from './components/EmailFooter'

interface InviteEmailProps {
  inviterName: string
  workspaceName: string
  role: string
  inviteUrl: string
}

export default function InviteEmail({
  inviterName,
  workspaceName,
  role,
  inviteUrl,
}: InviteEmailProps) {
  return (
    <EmailLayout previewText={`${inviterName} invited you to ${workspaceName}`}>
      <Section>
        <Heading style={heading}>You've been invited</Heading>
        <Text style={paragraph}>
          <strong>{inviterName}</strong> has invited you to join{' '}
          <strong>{workspaceName}</strong> on sprintix as a{' '}
          <strong>{role.toLowerCase()}</strong>.
        </Text>
        <Text style={paragraph}>
          sprintix is a team task management platform where you can track
          projects, collaborate in real-time, and ship work together.
        </Text>
        <Section style={buttonContainer}>
          <EmailButton href={inviteUrl}>Accept Invitation</EmailButton>
        </Section>
        <Text style={paragraph}>
          This invitation expires in 7 days. If you don't have a sprintix
          account yet, you'll be able to create one when you accept.
        </Text>
      </Section>
      <EmailFooter workspaceName={workspaceName} />
    </EmailLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '32px',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
