import type { WorkspaceConfig } from './types'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export type UrlResult = { ok: true; url: string } | { ok: false; error: string }

const INTERNAL_PREFIX = '/'

export function isInternalUrl(url: string): boolean {
  return url.startsWith(INTERNAL_PREFIX) && !url.startsWith('//')
}

/**
 * Normalises user input into something a browser frame can load.
 * Accepts bare hosts ("example.com"), full URLs, and internal paths ("/demo/").
 */
export function normalizeUrl(raw: string): UrlResult {
  const value = raw.trim()
  if (!value) return { ok: false, error: 'Enter a URL to preview.' }
  if (isInternalUrl(value)) return { ok: true, url: value }

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(value)
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase()
    if (scheme !== 'http' && scheme !== 'https') {
      return { ok: false, error: `Only http and https URLs can be previewed (got “${scheme}:”).` }
    }
  }

  const candidate = schemeMatch ? value : `https://${value}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, error: 'That does not look like a valid URL.' }
  }

  const host = parsed.hostname
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host)

  if (!host.includes('.') && !isLocal) {
    return { ok: false, error: 'Add a domain, for example example.com.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https URLs can be previewed.' }
  }

  if (!schemeMatch) {
    // Bare hosts default to https, except for local development servers.
    parsed = new URL(`${isLocal ? 'http' : 'https'}://${value}`)
  }

  return { ok: true, url: parsed.toString() }
}

export function hostOf(url: string): string {
  if (isInternalUrl(url)) return 'Sample site'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function displayUrl(url: string): string {
  if (isInternalUrl(url)) return 'viewport / demo'
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, '')
    return `${parsed.hostname.replace(/^www\./, '')}${path === '' ? '' : path}`
  } catch {
    return url
  }
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Encodes a workspace configuration into a URL-safe string. Config only — no content. */
export function encodeConfig(config: WorkspaceConfig): string {
  return toBase64Url(JSON.stringify({ v: 1, ...config }))
}

export function decodeConfig(encoded: string): WorkspaceConfig | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<WorkspaceConfig> & { v?: number }
    if (!parsed || !Array.isArray(parsed.previews) || parsed.previews.length === 0) return null
    return parsed as WorkspaceConfig
  } catch {
    return null
  }
}

export function buildShareUrl(config: WorkspaceConfig): string {
  return `${window.location.origin}/workspace?w=${encodeConfig(config)}`
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'viewport'
  )
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
