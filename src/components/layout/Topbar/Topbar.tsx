'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Search, Bell, Menu, Command, ChevronRight, Home } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '../NotificationBell'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TopbarProps {
  workspaceName?: string
  projectName?: string
}

export function Topbar({ workspaceName, projectName }: TopbarProps) {
  const pathname = usePathname()
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore()

  const breadcrumbItems = [{ label: workspaceName || 'Workspace', href: `/${workspaceName || ''}` }]

  if (projectName) {
    breadcrumbItems.push({
      label: projectName,
      href: pathname.substring(0, pathname.lastIndexOf('/')),
    })
  }

  const currentView = pathname.split('/').pop()
  if (currentView && ['board', 'list', 'timeline', 'backlog'].includes(currentView)) {
    breadcrumbItems.push({
      label: currentView.charAt(0).toUpperCase() + currentView.slice(1),
      href: pathname,
    })
  }

  return (
    <header className="bg-background flex h-12 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="size-8 lg:hidden"
            >
              <Menu className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>

        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center">
            <Home className="size-4" />
          </Link>
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight className="text-muted-foreground size-3" />
              <Link
                href={item.href}
                className={
                  index === breadcrumbItems.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }
              >
                {item.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandPaletteOpen(true)}
              className="size-8"
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="text-xs">Search</span>
            <kbd className="ml-2 font-mono text-xs">⌘K</kbd>
          </TooltipContent>
        </Tooltip>

        <NotificationBell />

        <UserButton />
      </div>
    </header>
  )
}
