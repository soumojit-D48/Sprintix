'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Bell,
  UserPlus,
  AtSign,
  MessageSquare,
  ClipboardList,
  Calendar,
  MailOpen,
  Mail,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationStore } from '@/stores/notification-store'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

const notificationIcons: Record<string, React.ComponentType<any>> = {
  ASSIGNED: UserPlus,
  MENTIONED: AtSign,
  COMMENTED: MessageSquare,
  STATUS_CHANGED: ClipboardList,
  DUE_SOON: Calendar,
  INVITED: MailOpen,
  MESSAGE_RECEIVED: Mail,
}

export function NotificationBell() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore()

  const [isOpen, setIsOpen] = useState(false)

  const markReadMutation = trpc.notification.markRead.useMutation()
  const markAllReadMutation = trpc.notification.markAllRead.useMutation()

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id)
      markReadMutation.mutate({ id: notification.id })
    }

    setIsOpen(false)

    // Navigation logic based on entity type and ID
    if (notification.entityId) {
      if (notification.type === 'MESSAGE_RECEIVED' || notification.entityType === 'message') {
        router.push(`/${workspaceSlug}/chat/${notification.entityId}`)
      } else if (notification.entityType === 'issue') {
        router.push(`/${workspaceSlug}/issues/${notification.entityId}`)
      } else if (notification.entityType === 'invite') {
        router.push(`/invite/${notification.entityId}`)
      }
    }
  }

  const handleMarkAllRead = () => {
    markAllAsRead()
    markAllReadMutation.mutate()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8 focus-visible:ring-0">
          <Bell className="size-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 font-mono text-[9px] font-bold text-white shadow-sm"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-7 px-2 text-xs text-primary hover:bg-muted"
            >
              <Check className="mr-1 size-3" />
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80 w-full">
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground/60 mb-2">
                  <Bell className="size-5" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No new notifications at this time.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent =
                  notificationIcons[notification.type] || Bell

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex w-full items-start gap-3 border-b border-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                      <IconComponent className="size-4" />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="size-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
