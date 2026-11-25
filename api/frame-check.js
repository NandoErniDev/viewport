/**
 * Frame policy check.
 *
 * A browser gives the host page no reliable signal when a site refuses to be
 * embedded: the iframe simply stays blank. This endpoint reads the headers the
 * site sends and reports whether any browser is allowed to frame it, so VIEWPORT
 * can explain a blank preview instead of showing white space.
 *
 * It performs a single HEAD request (GET with a 1-byte range as a fallback), never
 * returns a body, and refuses loopback/private hosts so it cannot be used as a
 * generic fetcher.
 */

const PRIVATE_HOST = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/i,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
  /\.local$/i,
]

function isPrivate(hostname) {
  return PRIVATE_HOST.some((pattern) => pattern.test(hostname))
}

/** Returns the frame-ancestors sources of a CSP, or null when the directive is absent. */
function frameAncestors(policy) {
  if (!policy) return null
  for (const directive of policy.split(';')) {
    const parts = directive.trim().split(/\s+/)
    const name = (parts.shift() || '').toLowerCase()
    if (name === 'frame-ancestors') return parts
  }
  return null
}

function classify(xfo, ancestors) {
  if (ancestors) {
    if (ancestors.includes('*')) return null
    if (ancestors.includes("'none'")) return { restriction: 'deny', detail: 'CSP frame-ancestors \'none\'' }
    return {
      restriction: 'restricted',
      detail: `CSP frame-ancestors ${ancestors.join(' ')}`,
    }
  }
  if (!xfo) return null
  const value = xfo.trim().toUpperCase()
  if (value.startsWith('DENY')) return { restriction: 'deny', detail: 'X-Frame-Options: DENY' }
  if (value.startsWith('SAMEORIGIN'))
    return { restriction: 'restricted', detail: 'X-Frame-Options: SAMEORIGIN' }
  return null
}

async function request(target, signal) {
  const headers = { 'user-agent': 'VIEWPORT frame check (+https://viewport.naerdev.ch)' }
  try {
    const head = await fetch(target, {
      method: 'HEAD',
      redirect: 'follow',
      signal,
      headers,
    })
    if (head.ok || head.status === 204) return head
  } catch (error) {
    if (signal.aborted) throw error
  }
  return fetch(target, {
    method: 'GET',
    redirect: 'follow',
    signal,
    headers: { ...headers, range: 'bytes=0-0' },
  })
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=600, stale-while-revalidate=600')

  const raw = req.query && req.query.url
  const value = Array.isArray(raw) ? raw[0] : raw

  let target
  try {
    target = new URL(String(value))
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'A valid url parameter is required.' }))
    return
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'Only http and https URLs can be checked.' }))
    return
  }
  if (isPrivate(target.hostname)) {
    res.statusCode = 403
    res.end(JSON.stringify({ error: 'Private hosts are not checked.' }))
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await request(target.href, controller.signal)
    const xfo = response.headers.get('x-frame-options')
    // Report-only policies are not enforced by any browser, so they must not be
    // reported as a restriction. Wikipedia, for example, lists frame-ancestors
    // only in the report-only header and embeds perfectly well.
    const ancestors = frameAncestors(response.headers.get('content-security-policy'))
    const verdict = classify(xfo, ancestors)

    res.statusCode = 200
    res.end(
      JSON.stringify({
        url: response.url || target.href,
        status: response.status,
        reachable: true,
        xfo: xfo || null,
        frameAncestors: ancestors,
        restriction: verdict ? verdict.restriction : null,
        detail: verdict ? verdict.detail : null,
      }),
    )
  } catch (error) {
    res.statusCode = 200
    res.end(
      JSON.stringify({
        url: target.href,
        status: 0,
        reachable: false,
        xfo: null,
        frameAncestors: null,
        restriction: null,
        detail: error && error.name === 'AbortError' ? 'The site did not answer in time.' : 'The site could not be reached.',
      }),
    )
  } finally {
    clearTimeout(timer)
  }
}
