import { createTRPCContext } from '@/server/context'
import { appRouter } from '@/server/routers/_app'
import { createCallerFactory } from '@/server/trpc'

const createContext = async () => {
  return createTRPCContext({
    req: new Request('http://internal'),
    resHeaders: new Headers(),
    info: {
      isBatchCall: false,
      calls: [],
      accept: null,
      type: 'unknown',
      connectionParams: null,
      signal: null,
      url: new URL('http://internal'),
    } as any,
  })
}

const createCaller = createCallerFactory(appRouter)

export const getServerAsyncCaller = async () => {
  const ctx = await createContext()
  return createCaller(ctx)
}
