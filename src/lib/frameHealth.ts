/**
 * Embedding health for a preview URL.
 *
 * Browsers do not report a blocked frame: the iframe just stays empty. The check
 * below asks our own endpoint which framing headers the site sends, which is the
 * only reliable client-side answer. It never bypasses anything — the result is
 * used to explain the blank frame, not to work around it.
 */

export type FrameVerdictState = 'ok' | 'blocked' | 'restricted' | 'unreachable' | 'unknown'

export interface FrameVerdict {
  state: FrameVerdictState
  detail: string
  target: string
}

interface RawVerdict {
  url?: string
  status?: number
  reachable?: boolean
  xfo?: string | null
  restriction?: 'deny' | 'restricted' | null
  detail?: string | null
}

const cache = new Map<string, Promise<FrameVerdict>>()

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function absolute(url: string): URL | null {
  try {
    return new URL(url, window.location.href)
  } catch {
    return null
  }
}

export function checkEmbedding(url: string): Promise<FrameVerdict> {
  const resolved = absolute(url)
  if (!resolved || !isHttp(resolved.href)) {
    return Promise.resolve({ state: 'ok', detail: '', target: url })
  }

  const key = resolved.href
  const cached = cache.get(key)
  if (cached) return cached

  const run = (async (): Promise<FrameVerdict> => {
    try {
      const response = await fetch(`/api/frame-check?url=${encodeURIComponent(key)}`, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) return { state: 'unknown', detail: '', target: key }
      const data = (await response.json()) as RawVerdict

      if (data.reachable === false) {
        return { state: 'unreachable', detail: data.detail ?? 'The site could not be reached.', target: key }
      }

      const sameOrigin = resolved.origin === window.location.origin
      if (data.restriction === 'deny') {
        return { state: 'blocked', detail: data.detail ?? 'Framing is refused.', target: key }
      }
      if (data.restriction === 'restricted') {
        // SAMEORIGIN still allows a preview of a page on this very origin.
        if (sameOrigin) return { state: 'ok', detail: '', target: key }
        return { state: 'blocked', detail: data.detail ?? 'Only same-origin framing is allowed.', target: key }
      }
      return { state: 'ok', detail: '', target: key }
    } catch {
      return { state: 'unknown', detail: '', target: key }
    }
  })()

  cache.set(key, run)
  return run
}
