import { getServerAsyncCaller } from '@/lib/trpc/server'
import { ClientTest } from './client-test'

export default async function TestTRPCPage() {
  const trpc = await getServerAsyncCaller()
  const serverResult = await trpc.health.check()

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">tRPC Test Page</h1>

      <div className="mb-4 rounded border p-4">
        <h2 className="font-semibold">Server Component Result:</h2>
        <pre className="mt-2 rounded bg-gray-100 p-2">{JSON.stringify(serverResult, null, 2)}</pre>
      </div>

      <ClientTest />
    </div>
  )
}
