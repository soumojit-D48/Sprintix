import { Section, Text, Heading, Hr } from '@react-email/components'
import * as React from 'react'
import EmailLayout from './components/EmailLayout'
import EmailFooter from './components/EmailFooter'

interface DigestItem {
  projectName: string
  items: {
    type: 'status_change' | 'new_comment' | 'new_assignment'
    issueIdentifier: string
    issueTitle: string
    summary: string
  }[]
}

interface DailyDigestEmailProps {
  userName: string
  workspaceName: string
  items: DigestItem[]
  dashboardUrl: string
}

export default function DailyDigestEmail({
  userName,
  workspaceName,
  items,
  dashboardUrl,
}: DailyDigestEmailProps) {
  const totalChanges = items.reduce(
    (sum, group) => sum + group.items.length,
    0
  )

  return (
    <EmailLayout
      previewText={`${totalChanges} update${totalChanges === 1 ? '' : 's'} on your issues in ${workspaceName}`}
    >
      <Section>
        <Text style={greeting}>Hi {userName},</Text>
        <Text style={paragraph}>
          Here is your daily summary of activity on your assigned issues in{' '}
          <strong>{workspaceName}</strong>.
        </Text>
        <Text style={summaryLine}>
          <strong>{totalChanges}</strong> update
          {totalChanges === 1 ? '' : 's'} today
        </Text>

        {items.map((group, groupIndex) => (
          <Section key={groupIndex} style={groupSection}>
            <Heading style={projectHeading}>{group.projectName}</Heading>
            {group.items.map((item, itemIndex) => (
              <Section key={itemIndex} style={itemRow}>
                <Text style={itemType}>
                  {item.type === 'status_change' && '🔄'}
                  {item.type === 'new_comment' && '💬'}
                  {item.type === 'new_assignment' && '👤'}{' '}
                  <strong>{item.issueIdentifier}</strong> — {item.issueTitle}
                </Text>
                <Text style={itemSummary}>{item.summary}</Text>
              </Section>
            ))}
            {groupIndex < items.length - 1 && <Hr style={hr} />}
          </Section>
        ))}

        <Section style={buttonContainer}>
          <a href={dashboardUrl} style={dashboardLink}>
            Go to Dashboard →
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

const summaryLine = {
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  color: '#15803d',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 24px',
  padding: '8px 12px',
}

const groupSection = {
  marginBottom: '24px',
}

const projectHeading = {
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: '24px',
  margin: '0 0 12px',
  color: '#1e293b',
}

const itemRow = {
  marginBottom: '12px',
  paddingLeft: '8px',
}

const itemType = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 2px',
}

const itemSummary = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
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
