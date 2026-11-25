import { isInternalUrl } from './utils'

export type FramingStatus = 'allowed' | 'blocked' | 'unknown'

export interface FramingResult {
  status: FramingStatus
  detail?: string
}

const cache = new Map<string, FramingResult>()

function sameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return true
  }
}

function headerDecision(url: string, headers: Headers): FramingResult {
  const xfo = (headers.get('x-frame-options') ?? '').toLowerCase()
  if (xfo.includes('deny')) return { status: 'blocked', detail: 'X-Frame-Options: DENY' }
  if (xfo.includes('sameorigin') && !sameOrigin(url)) {
    return { status: 'blocked', detail: 'X-Frame-Options: SAMEORIGIN' }
  }

  const csp = (headers.get('content-security-policy') ?? '').toLowerCase()
  const directive = /frame-ancestors\s+([^;]+)/.exec(csp)
  if (directive) {
    const value = directive[1].trim()
    const origin = window.location.origin
    if (value.includes("'none'")) {
      return { status: 'blocked', detail: 'CSP frame-ancestors none' }
    }
    const permitsAny = value.includes('*') || value.includes('https:') || value.includes('http:')
    if (!permitsAny && !value.includes(origin)) {
      return { status: 'blocked', detail: 'CSP frame-ancestors' }
    }
  }

  return { status: 'allowed' }
}

/**
 * Best-effort check of a site's framing policy.
 *
 * Cross-origin responses are usually unreadable without CORS, in which case the
 * answer is honestly "unknown" — we never claim a preview is blocked (or allowed)
 * without evidence.
 */
export async function probeFraming(url: string): Promise<FramingResult> {
  if (isInternalUrl(url) || sameOrigin(url)) return { status: 'allowed' }
  const cached = cache.get(url)
  if (cached) return cached

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    })
    const result = headerDecision(url, response.headers)
    cache.set(url, result)
    return result
  } catch {
    const result: FramingResult = { status: 'unknown' }
    cache.set(url, result)
    return result
  } finally {
    window.clearTimeout(timer)
  }
}
