import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
  Text,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface EmailLayoutProps {
  previewText: string
  children: React.ReactNode
}

export default function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src="https://sprintix.app/logo.png"
              alt="sprintix"
              width={120}
              height={30}
              style={logo}
            />
          </Section>
          <Section style={contentSection}>{children}</Section>
          <Hr style={hr} />
          <Section style={footerSection}>
            <Text style={footerText}>
              sprintix — Team Task Management
            </Text>
            <Text style={footerTextSmall}>
              If you didn't expect this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '0',
}

const headerSection = {
  padding: '32px 40px 0',
}

const logo = {
  margin: '0 auto',
  display: 'block',
}

const contentSection = {
  padding: '8px 40px 32px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '0 40px',
}

const footerSection = {
  padding: '24px 40px 32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#525f7f',
  fontSize: '13px',
  lineHeight: '16px',
  margin: '0',
}

const footerTextSmall = {
  color: '#8898aa',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '8px 0 0',
}
