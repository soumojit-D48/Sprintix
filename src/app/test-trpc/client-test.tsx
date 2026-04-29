'use client'

import { trpc } from '@/lib/trpc/provider'

export function ClientTest() {
  const { data, isLoading, error } = trpc.health.check.useQuery()

  if (isLoading) return <p>Loading client query...</p>
  if (error) return <p className="text-red-500">Error: {error.message}</p>

  return (
    <div className="rounded border p-4">
      <h2 className="font-semibold">Client Component Result:</h2>
      <pre className="mt-2 rounded bg-gray-100 p-2">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
