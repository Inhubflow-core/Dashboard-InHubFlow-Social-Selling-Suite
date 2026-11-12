import type { DocObject } from '@visual-studio/types/document'

export const CLIPBOARD_MIME = 'application/x-doory+json'
const TEXT_MARKER = 'doory-clipboard/v1'

export interface ClipboardPayload {
  kind: typeof TEXT_MARKER
  objects: DocObject[]
  /** Source page size, so pasted content can be re-centred on a differently sized page. */
  page: { width: number; height: number }
  /** Source page ID so pasting onto another page can preserve exact coordinates */
  sourcePageId?: string
}

export function encodeClipboard(objects: DocObject[], page: { width: number; height: number }, sourcePageId?: string): string {
  const payload: ClipboardPayload = { kind: TEXT_MARKER, objects, page, ...(sourcePageId ? { sourcePageId } : {}) }
  return JSON.stringify(payload)
}

/** Parses clipboard text produced by `encodeClipboard`; returns null for anything else. */
export function decodeClipboard(text: string): ClipboardPayload | null {
  if (!text.startsWith('{') || !text.includes(TEXT_MARKER)) return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Partial<ClipboardPayload>
    if (p.kind !== TEXT_MARKER || !Array.isArray(p.objects) || !p.page) return null
    const objects = p.objects.filter((o): o is DocObject => !!o && typeof o === 'object' && typeof (o as DocObject).type === 'string')
    if (objects.length === 0) return null
    const { width, height } = p.page
    if (typeof width !== 'number' || typeof height !== 'number') return null
    const sourcePageId = typeof p.sourcePageId === 'string' ? p.sourcePageId : undefined
    return { kind: TEXT_MARKER, objects, page: { width, height }, ...(sourcePageId ? { sourcePageId } : {}) }
  } catch {
    return null
  }
}
