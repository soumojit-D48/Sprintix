import { Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import EmailLayout from './components/EmailLayout'
import EmailButton from './components/EmailButton'
import EmailFooter from './components/EmailFooter'

interface MentionEmailProps {
  actorName: string
  contextType: 'issue' | 'channel'
  contextName: string
  snippet: string
  conversationUrl: string
}

export default function MentionEmail({
  actorName,
  contextType,
  contextName,
  snippet,
  conversationUrl,
}: MentionEmailProps) {
  const contextLabel =
    contextType === 'issue' ? `issue ${contextName}` : `channel #${contextName}`

  return (
    <EmailLayout
      previewText={`${actorName} mentioned you in ${contextLabel}`}
    >
      <Section>
        <Heading style={heading}>You've been mentioned</Heading>
        <Text style={paragraph}>
          <strong>{actorName}</strong> mentioned you in {contextLabel}.
        </Text>
        <Section style={snippetContainerStyle}>
          <Text style={snippetLabelStyle}>Message:</Text>
          <Text style={snippetStyle}>{snippet}</Text>
        </Section>
        <Section style={buttonContainer}>
          <EmailButton href={conversationUrl}>View Conversation</EmailButton>
        </Section>
      </Section>
      <EmailFooter />
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

const snippetContainerStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  borderLeft: '3px solid #6366f1',
  marginBottom: '16px',
  padding: '12px 16px',
}

const snippetLabelStyle = {
  color: '#8898aa',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const snippetStyle = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
