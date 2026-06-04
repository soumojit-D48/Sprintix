'use client'

import { useState, useEffect } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UploadButton } from '@/hooks/use-upload'
import { toast } from 'sonner'

const TIMEZONES = Intl.supportedValuesOf?.('timeZone') ?? [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export default function ProfileSettingsPage() {
  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery()
  const utils = trpc.useUtils()

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully')
      utils.settings.getProfile.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  useEffect(() => {
    if (profile && !loaded) {
      setName(profile.name)
      setAvatarUrl(profile.avatarUrl)
      setTimezone(profile.timezone ?? null)
      setLoaded(true)
    }
  }, [profile, loaded])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    updateProfile.mutate({
      name: name.trim(),
      avatarUrl: avatarUrl,
      timezone: timezone,
    })
  }

  const hasChanges =
    name !== profile?.name ||
    avatarUrl !== (profile?.avatarUrl ?? null) ||
    timezone !== (profile?.timezone ?? null)

  if (isLoading || !profile) {
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
        <h1 className="mb-8 text-2xl font-bold">Profile Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your display name, avatar, and timezone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage src={avatarUrl ?? ''} />
                  <AvatarFallback className="text-lg">
                    {(profile.name ?? 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <UploadButton
                    endpoint="userAvatar"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]) {
                        setAvatarUrl(res[0].url)
                        toast.success('Avatar uploaded')
                      }
                    }}
                    onUploadError={(error) => {
                      toast.error(error.message)
                    }}
                  />
                  {avatarUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAvatarUrl(null)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="text-muted-foreground"
              />
              <p className="text-muted-foreground text-xs">
                Email is managed by your authentication provider.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={timezone ?? ''}
                onValueChange={(val) => setTimezone(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={!hasChanges || updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Manage your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              Password management is handled by your authentication provider.
            </p>
            <Button variant="outline" asChild>
              <a
                href="https://clerk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                Manage Password
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
