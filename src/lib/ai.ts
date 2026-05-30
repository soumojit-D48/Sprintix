import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  headers: {
    'HTTP-Referer': 'https://sprintix.app',
    'X-Title': 'Sprintix',
  },
})

export const model = openrouter('nvidia/nemotron-3-super-120b-a12b:free')

const rateLimitMap = new Map<string, number[]>()

const AI_REQUESTS_PER_DAY = 50
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function checkAiRateLimit(workspaceId: string): void {
  const now = Date.now()
  const timestamps = rateLimitMap.get(workspaceId) ?? []

  const recent = timestamps.filter((t) => now - t < ONE_DAY_MS)

  if (recent.length >= AI_REQUESTS_PER_DAY) {
    throw new Error('RATE_LIMIT_EXCEEDED')
  }

  recent.push(now)
  rateLimitMap.set(workspaceId, recent)
}
