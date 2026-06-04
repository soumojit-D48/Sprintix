'use client'

import { useParams } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function BillingSettingsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  if (!workspace) {
    return (
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl px-6 py-8">Loading...</div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold">Billing</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your workspace subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="text-muted-foreground size-5" />
                <div>
                  <p className="font-medium">
                    {workspace.plan === 'PRO' ? 'Pro Plan' : 'Free Plan'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {workspace.plan === 'PRO'
                      ? 'All features unlocked'
                      : 'Basic features with limitations'}
                  </p>
                </div>
              </div>
              <Badge variant={workspace.plan === 'PRO' ? 'default' : 'secondary'}>
                {workspace.plan}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {workspace.plan === 'FREE' && (
          <Card>
            <CardHeader>
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Get unlimited members, priority support, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
