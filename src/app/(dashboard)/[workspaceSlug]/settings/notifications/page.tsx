'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface NotificationPref {
  key: string
  label: string
  description: string
}

const NOTIFICATION_TYPES: NotificationPref[] = [
  {
    key: 'emailOnAssignment',
    label: 'Email on Assignment',
    description: 'Receive an email when an issue is assigned to you',
  },
  {
    key: 'emailOnMention',
    label: 'Email on @mention',
    description: 'Receive an email when you are @mentioned in a comment',
  },
  {
    key: 'emailDailyDigest',
    label: 'Daily Digest',
    description: 'Receive a daily summary of activity in your workspaces',
  },
  {
    key: 'emailWeeklySummary',
    label: 'Weekly Summary',
    description: 'Receive a weekly summary of your team\'s progress',
  },
]

export default function NotificationSettingsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const utils = trpc.useUtils()

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const { data: preferences, isLoading: prefsLoading } = trpc.settings.getNotificationPreferences.useQuery()
  const { data: channelMutes } = trpc.settings.getChannelMutes.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )
  const { data: channels, isLoading: channelsLoading } = trpc.settings.getUserChannels.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({})
  const [mutedChannels, setMutedChannels] = useState<string[]>([])

  const updatePrefs = trpc.settings.updateNotificationPreferences.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const toggleChannelMute = trpc.settings.toggleChannelMute.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  useEffect(() => {
    if (channelMutes) {
      setMutedChannels(channelMutes.mutedChannels)
    }
  }, [channelMutes])

  const handlePrefChange = useCallback(
    (key: string, value: boolean) => {
      const newPrefs = { ...localPrefs, [key]: value }
      setLocalPrefs(newPrefs)
      updatePrefs.mutate({ preferences: newPrefs })
    },
    [localPrefs, updatePrefs]
  )

  const handleChannelMute = useCallback(
    (channelId: string, muted: boolean) => {
      if (muted) {
        setMutedChannels((prev) => [...prev, channelId])
      } else {
        setMutedChannels((prev) => prev.filter((id) => id !== channelId))
      }
      toggleChannelMute.mutate({ channelId, muted })
    },
    [toggleChannelMute]
  )

  if (prefsLoading) {
    return (
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl px-6 py-8">
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold">Notification Preferences</h1>

        {/* Email Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Control which emails you receive</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NOTIFICATION_TYPES.map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={pref.key}>{pref.label}</Label>
                    <p className="text-muted-foreground text-xs">
                      {pref.description}
                    </p>
                  </div>
                  <Switch
                    id={pref.key}
                    checked={localPrefs[pref.key] ?? false}
                    onCheckedChange={(checked) => handlePrefChange(pref.key, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channel Mute Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Mute Settings</CardTitle>
            <CardDescription>Mute notifications from specific channels</CardDescription>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Loading channels...
              </div>
            ) : !channels || channels.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No channels found.
              </p>
            ) : (
              <div className="space-y-3">
                {channels.map((channel) => {
                  const isMuted = mutedChannels.includes(channel.id)
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {isMuted ? (
                          <VolumeX className="text-muted-foreground size-4" />
                        ) : (
                          <Volume2 className="text-muted-foreground size-4" />
                        )}
                        <span className="text-sm"># {channel.name}</span>
                      </div>
                      <Switch
                        checked={isMuted}
                        onCheckedChange={(checked) => handleChannelMute(channel.id, checked)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
