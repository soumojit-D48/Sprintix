'use client'

import { useState } from 'react'
import { Loader2, Key, Copy, Check, Trash2, AlertTriangle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function ApiKeysPage() {
  const { data: apiKeys, isLoading } = trpc.settings.getApiKeys.useQuery()
  const utils = trpc.useUtils()

  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null)

  const createApiKey = trpc.settings.createApiKey.useMutation({
    onSuccess: (data) => {
      setCreateOpen(false)
      setKeyName('')
      setNewKeyData({ key: data.key, name: data.name })
      utils.settings.getApiKeys.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const revokeApiKey = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key revoked')
      setRevokeOpen(false)
      setRevokeKeyId(null)
      utils.settings.getApiKeys.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreate = () => {
    if (!keyName.trim()) {
      toast.error('Key name is required')
      return
    }
    createApiKey.mutate({ name: keyName.trim() })
  }

  const handleCopy = async () => {
    if (newKeyData) {
      await navigator.clipboard.writeText(newKeyData.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleRevoke = () => {
    if (revokeKeyId) {
      revokeApiKey.mutate({ keyId: revokeKeyId })
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Key className="mr-2 size-4" />
            Generate New Key
          </Button>
        </div>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              These keys allow full access to your workspace data. Keep them secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No API keys yet. Generate one to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="text-muted-foreground size-4" />
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="bg-muted rounded px-1 py-0.5">{key.keyPrefix}...</code>
                          <span>·</span>
                          <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                          {key.lastUsedAt && (
                            <>
                              <span>·</span>
                              <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setRevokeKeyId(key.id)
                        setRevokeOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Key Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
              <DialogDescription>
                Give your key a name so you can identify it later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. CI/CD Pipeline"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createApiKey.isPending}>
                {createApiKey.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show New Key Dialog */}
        <Dialog
          open={!!newKeyData}
          onOpenChange={(open) => {
            if (!open) setNewKeyData(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Copy this key now. You will not be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-destructive/10 text-destructive mb-3 flex items-center gap-2 rounded-md border border-destructive/20 px-3 py-2 text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>This key is shown only once. Copy it now and store it securely.</span>
              </div>
              <Label>Your API Key</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newKeyData?.key ?? ''}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewKeyData(null)}>
                {copied ? 'Done' : 'I\'ll copy later'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
        <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive size-5" />
                Revoke API Key
              </DialogTitle>
              <DialogDescription>
                This will immediately revoke the API key. Any services using this key will
                lose access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={revokeApiKey.isPending}
              >
                {revokeApiKey.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Revoke
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
