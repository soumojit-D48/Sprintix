'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings,
  User,
  Users,
  CreditCard,
  Bell,
  Key,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SettingsSidebarProps {
  workspaceSlug: string
  isOwner: boolean
}

interface SidebarLink {
  title: string
  href: string
  icon: React.ElementType
  ownerOnly?: boolean
}

const sidebarLinks: SidebarLink[] = [
  { title: 'General', href: '/settings', icon: Settings },
  { title: 'Profile', href: '/settings/profile', icon: User },
  { title: 'Members', href: '/settings/members', icon: Users },
  { title: 'Billing', href: '/settings/billing', icon: CreditCard },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell },
  { title: 'API Keys', href: '/settings/api-keys', icon: Key },
  {
    title: 'Danger Zone',
    href: '/settings#danger-zone',
    icon: ShieldAlert,
    ownerOnly: true,
  },
]

export function SettingsSidebar({ workspaceSlug, isOwner }: SettingsSidebarProps) {
  const pathname = usePathname()

  const basePath = `/${workspaceSlug}`

  const isActive = (href: string) => {
    const fullHref = `${basePath}${href}`
    if (href === '/settings') {
      return pathname === fullHref
    }
    return pathname.startsWith(fullHref)
  }

  return (
    <aside className="w-56 shrink-0 border-r">
      <div className="px-4 py-5">
        <h2 className="mb-1 text-lg font-semibold">Settings</h2>
        <p className="text-muted-foreground text-xs">Manage your workspace</p>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="space-y-0.5 px-3">
          {sidebarLinks.map((link) => {
            if (link.ownerOnly && !isOwner) return null
            return (
              <Link
                key={link.title}
                href={`${basePath}${link.href}`}
                className={cn(
                  'hover:bg-muted flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive(link.href) && 'bg-muted font-medium'
                )}
              >
                <link.icon className="size-4 shrink-0" />
                <span>{link.title}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
