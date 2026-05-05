import { ReactNode } from 'react'
import { DashboardProviders } from '@/components/layout/DashboardProviders'

export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>
}
