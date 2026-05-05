import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link href="/">
        <Button>
          <Home className="mr-2 size-4" />
          Go Home
        </Button>
      </Link>
    </div>
  )
}
