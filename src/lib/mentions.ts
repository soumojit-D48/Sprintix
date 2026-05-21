export function extractMentionsFromTiptap(
  json: unknown
): string[] {
  if (!json || typeof json !== 'object') return []

  const obj = json as { content?: unknown[] }
  if (!obj.content) return []

  const userIds: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as { type?: string; attrs?: { id?: string }; content?: unknown[] }
    if (n.type === 'mention' && n.attrs?.id) {
      userIds.push(n.attrs.id)
    }
    if (n.content) {
      n.content.forEach(walk)
    }
  }

  obj.content.forEach(walk)
  return [...new Set(userIds)]
}
