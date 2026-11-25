/**
 * Scroll synchronisation between preview frames.
 *
 * Browsers only allow reading or writing the scroll position of a frame whose
 * document is same-origin. As soon as a frame shows a cross-origin document its
 * `contentDocument` is `null`, so that is reported immediately instead of after a
 * timeout. No proxy, no bypass.
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

function isSuppressed(instanceId: string): boolean {
  const until = suppressUntil.get(instanceId) ?? 0
  return Date.now() < until
}

export interface ScrollSyncHandlers {
  onScroll: (ratio: number) => void
  onAvailability: (available: boolean) => void
}

/**
 * Waits for the frame document, then mirrors scroll events. Returns a cleanup
 * function. A cross-origin frame has no readable document at all, which settles
 * the answer in the first probe rather than after a timeout.
 */
export function attachScrollSync(
  instanceId: string,
  frame: HTMLIFrameElement,
  handlers: ScrollSyncHandlers,
): () => void {
  let listener: (() => void) | null = null
  let scroller: HTMLElement | null = null
  let attempts = 0

  const settle = (available: boolean) => {
    window.clearInterval(timer)
    handlers.onAvailability(available)
  }

  const probe = () => {
    attempts += 1

    let doc: Document | null = null
    try {
      doc = frame.contentDocument ?? null
    } catch {
      doc = null
    }
    if (!doc) {
      settle(false)
      return
    }

    let href = ''
    try {
      href = doc.location.href
    } catch {
      href = ''
    }
    if (!href || href === 'about:blank' || doc.readyState !== 'complete') {
      // An unfinished document is not an answer yet; give it six seconds.
      if (attempts > 60) settle(false)
      return
    }

    const candidate = (doc.scrollingElement as HTMLElement | null) ?? doc.documentElement
    if (!candidate) {
      settle(false)
      return
    }

    window.clearInterval(timer)
    handlers.onAvailability(true)
    scroller = candidate
    listener = () => {
      if (isSuppressed(instanceId)) return
      const max = candidate.scrollHeight - candidate.clientHeight
      if (max < 8) return
      handlers.onScroll(candidate.scrollTop / max)
    }
    candidate.ownerDocument.addEventListener('scroll', listener, { passive: true })
  }

  const timer = window.setInterval(probe, 100)
  probe()

  return () => {
    window.clearInterval(timer)
    if (listener && scroller) {
      scroller.ownerDocument.removeEventListener('scroll', listener)
    }
  }
}
