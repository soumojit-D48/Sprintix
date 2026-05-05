import { Skeleton } from '@/components/ui/skeleton'

export default function WorkspaceLoading() {
  return (
    <div className="flex h-full w-full">
      <aside className="bg-background w-64 border-r">
        <div className="border-b p-3">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-2 p-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b px-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>
        <div className="flex-1 p-4">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  )
}
