import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="size-8 animate-spin rounded-full" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  )
}
