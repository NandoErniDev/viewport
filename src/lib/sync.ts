/**
 * Scroll synchronisation between preview frames.
 *
 * Browsers only allow reading or writing the scroll position of a frame whose
 * document is same-origin. For every other site this module reports "unavailable"
 * instead of pretending to sync — no proxy, no bypass.
 */

const registry = new Map<string, HTMLIFrameElement>()
const suppressUntil = new Map<string, number>()

export function registerPane(instanceId: string, frame: HTMLIFrameElement | null): void {
  if (frame) registry.set(instanceId, frame)
  else registry.delete(instanceId)
}

function scrollElement(frame: HTMLIFrameElement): HTMLElement | null {
  try {
    const doc = frame.contentDocument
    if (!doc) return null
    return (doc.scrollingElement as HTMLElement | null) ?? doc.documentElement
  } catch {
    return null
  }
}

export function readScrollRatio(instanceId: string): number | null {
  const frame = registry.get(instanceId)
  if (!frame) return null
  const scroller = scrollElement(frame)
  if (!scroller) return null
  const max = scroller.scrollHeight - scroller.clientHeight
  if (max < 8) return null
  return scroller.scrollTop / max
}

export function writeScrollRatio(instanceId: string, ratio: number): void {
  const frame = registry.get(instanceId)
  if (!frame) return
  const scroller = scrollElement(frame)
  if (!scroller) return
  const max = scroller.scrollHeight - scroller.clientHeight
  if (max < 8) return
  suppressUntil.set(instanceId, Date.now() + 120)
  scroller.scrollTop = Math.round(ratio * max)
}

export function isSuppressed(instanceId: string): boolean {
  const until = suppressUntil.get(instanceId) ?? 0
  return Date.now() < until
}

export interface ScrollSyncHandlers {
  onScroll: (ratio: number) => void
  onAvailability: (available: boolean) => void
}

/**
 * Waits for the frame document to become readable, then mirrors scroll events.
 * Returns a cleanup function. Polling stops after 20s if the document stays opaque.
 */
export function attachScrollSync(
  instanceId: string,
  frame: HTMLIFrameElement,
  handlers: ScrollSyncHandlers,
): () => void {
  let listener: (() => void) | null = null
  let scroller: HTMLElement | null = null
  let attempts = 0

  const timer = window.setInterval(() => {
    attempts += 1
    const candidate = scrollElement(frame)
    if (!candidate) {
      if (attempts > 50) {
        window.clearInterval(timer)
        handlers.onAvailability(false)
      }
      return
    }
    window.clearInterval(timer)
    scroller = candidate
    handlers.onAvailability(true)
    listener = () => {
      if (isSuppressed(instanceId)) return
      const max = candidate.scrollHeight - candidate.clientHeight
      if (max < 8) return
      handlers.onScroll(candidate.scrollTop / max)
    }
    candidate.ownerDocument.addEventListener('scroll', listener, { passive: true })
  }, 400)

  return () => {
    window.clearInterval(timer)
    if (listener && scroller) {
      scroller.ownerDocument.removeEventListener('scroll', listener)
    }
  }
}
