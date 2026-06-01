"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { FileIcon, Download, Trash2, Paperclip, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/provider"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UploadDropzone } from "@/hooks/use-upload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return null
  return <FileIcon className="text-muted-foreground size-5" />
}

interface IssueAttachmentsProps {
  issueId: string
  workspaceId: string | undefined
  currentUserId: string | undefined
}

export function IssueAttachments({ issueId, workspaceId, currentUserId }: IssueAttachmentsProps) {
  const utils = trpc.useUtils()
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: attachments, isLoading } = trpc.issue.listAttachments.useQuery({ issueId })

  const addAttachment = trpc.issue.addAttachment.useMutation({
    onSuccess: () => {
      utils.issue.listAttachments.invalidate({ issueId })
      utils.issue.getById.invalidate({ issueId })
      setUploading(false)
    },
    onError: (err) => {
      toast.error(err.message)
      setUploading(false)
    },
  })

  const removeAttachment = trpc.issue.removeAttachment.useMutation({
    onSuccess: () => {
      utils.issue.listAttachments.invalidate({ issueId })
      utils.issue.getById.invalidate({ issueId })
      setDeleteDialog(null)
      toast.success("Attachment deleted")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-muted h-12 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">
          Attachments {attachments && attachments.length > 0 && `(${attachments.length})`}
        </span>
      </div>

      {attachments && attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((attachment) =>
            attachment.mimeType.startsWith("image/") ? (
              <div key={attachment.id} className="group relative">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="border-border h-28 w-full rounded-lg border object-cover"
                />
                <div className="bg-background/90 invisible absolute right-1 top-1 flex gap-1 rounded-md p-1 opacity-0 group-hover:visible group-hover:opacity-100 transition-all">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => window.open(attachment.url, "_blank")}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => setDeleteDialog(attachment.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-1 truncate px-0.5">
                  <p className="truncate text-xs font-medium">{attachment.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatFileSize(attachment.size)} ·{" "}
                    {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={attachment.id}
                className="border-border hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
                  {getFileIcon(attachment.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{attachment.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(attachment.size)} ·{" "}
                    {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="invisible flex gap-0.5 group-hover:visible">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => window.open(attachment.url, "_blank")}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => setDeleteDialog(attachment.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {uploading ? (
        <div className="border-border flex items-center justify-center gap-2 rounded-lg border border-dashed p-6">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Uploading...</span>
        </div>
      ) : (
        <UploadDropzone
          endpoint="issueAttachment"
          config={{ mode: "auto" }}
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            for (const file of res) {
              addAttachment.mutate({
                issueId,
                name: file.name,
                url: file.url,
                size: file.size,
                mimeType: file.type,
              })
            }
          }}
          onUploadError={(err) => {
            toast.error(err.message)
            setUploading(false)
          }}
          className="border-border ut-label:text-muted-foreground ut-allowed-content:text-muted-foreground ut-button:bg-primary ut-button:hover:bg-primary/90 ut-button:text-primary-foreground cursor-pointer rounded-lg border-2 border-dashed p-4 text-sm transition-colors hover:bg-muted/50"
        />
      )}

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete attachment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog) {
                  removeAttachment.mutate({ attachmentId: deleteDialog })
                }
              }}
              disabled={removeAttachment.isPending}
            >
              {removeAttachment.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
