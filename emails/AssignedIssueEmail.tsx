import { Section, Text, Heading } from '@react-email/components'
import * as React from 'react'
import EmailLayout from './components/EmailLayout'
import EmailButton from './components/EmailButton'
import EmailFooter from './components/EmailFooter'

interface AssignedIssueEmailProps {
  issueIdentifier: string
  issueTitle: string
  priority: string
  descriptionPreview?: string | null
  dueDate?: string | null
  assigneeName: string
  projectName: string
  issueUrl: string
}

export default function AssignedIssueEmail({
  issueIdentifier,
  issueTitle,
  priority,
  descriptionPreview,
  dueDate,
  assigneeName,
  projectName,
  issueUrl,
}: AssignedIssueEmailProps) {
  const priorityColors: Record<string, string> = {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#ca8a04',
    LOW: '#16a34a',
    NO_PRIORITY: '#6b7280',
  }

  return (
    <EmailLayout previewText={`${issueIdentifier} — ${issueTitle}`}>
      <Section>
        <Text style={label}>Assigned to you</Text>
        <Heading style={heading}>
          {issueIdentifier}: {issueTitle}
        </Heading>

        <Section style={metaRow}>
          <span
            style={{
              ...priorityBadge,
              backgroundColor: priorityColors[priority] || '#6b7280',
            }}
          >
            {priority.replace('_', ' ')}
          </span>
          <Text style={projectText}>{projectName}</Text>
        </Section>

        {descriptionPreview && (
          <Text style={preview}>{descriptionPreview}</Text>
        )}

        <Section style={details}>
          {dueDate && (
            <Text style={detailItem}>
              <strong>Due date:</strong> {dueDate}
            </Text>
          )}
          <Text style={detailItem}>
            <strong>Assigned to:</strong> {assigneeName}
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <EmailButton href={issueUrl}>View Issue</EmailButton>
        </Section>
      </Section>
      <EmailFooter />
    </EmailLayout>
  )
}

const label = {
  color: '#6366f1',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
}

const heading = {
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '28px',
  margin: '0 0 16px',
}

const metaRow = {
  marginBottom: '16px',
}

const priorityBadge = {
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.05em',
  padding: '2px 8px',
  borderRadius: '4px',
  textTransform: 'uppercase' as const,
}

const projectText = {
  color: '#525f7f',
  display: 'inline-block',
  fontSize: '13px',
  margin: '0 0 0 8px',
}

const preview = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  borderLeft: '3px solid #6366f1',
}

const details = {
  marginBottom: '16px',
}

const detailItem = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 4px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
