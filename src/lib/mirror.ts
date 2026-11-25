/**
 * Input mirroring between previews.
 *
 * Browsers expose the DOM of a same-origin frame only, so input can be replayed
 * exactly between previews of a page served from this origin (the built-in
 * `/demo/`, or anything else on this host). A cross-origin frame is opaque: there
 * is no event, no DOM and no way to synthesise a click inside it. Those previews
 * report "No mirror" instead of pretending, and nothing is proxied.
 *
 * Two details make this work in practice:
 *  - Elements from a frame belong to that frame's realm, so `instanceof Element`
 *    against the parent window is always false. Everything here checks tag names
 *    and capabilities instead.
 *  - Events are constructed with the target document's own constructors, because
 *    a parent-realm `MouseEvent` dispatched into a child document is not a
 *    `MouseEvent` there.
 *
 * Replayed events are untrusted (`isTrusted === false`), which is what stops the
 * mirror from feeding itself.
 */

export type MirrorPayload =
  | { kind: 'click'; path: string }
  | { kind: 'input'; path: string; value: string }
  | { kind: 'key'; path: string; key: string; code: string; submit: boolean }

interface FrameBinding {
  id: string
  frame: HTMLIFrameElement
}

const bindings = new Map<string, FrameBinding>()

function readableDoc(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument ?? null
  } catch {
    return null
  }
}

function routeOf(doc: Document): string {
  try {
    return `${doc.location.pathname}${doc.location.search}`
  } catch {
    return ''
  }
}

function tagOf(element: Element): string {
  return element.tagName.toLowerCase()
}

function segment(element: Element): string {
  const parent = element.parentElement
  const tag = tagOf(element)
  if (!parent) return `${tag}:0`
  const index = Array.prototype.indexOf.call(parent.children, element)
  return `${tag}:${index}`
}

function pathOf(element: Element): string {
  const parts: string[] = []
  let node: Element | null = element
  const root = element.ownerDocument.documentElement
  while (node && node !== root) {
    parts.unshift(segment(node))
    node = node.parentElement
  }
  return parts.join('>')
}

function resolvePath(doc: Document, path: string): Element | null {
  let node: Element = doc.documentElement
  for (const part of path.split('>')) {
    if (!part) continue
    const separator = part.lastIndexOf(':')
    const tag = part.slice(0, separator)
    const index = Number(part.slice(separator + 1))
    const child = node.children[index]
    if (!child || tagOf(child) !== tag) return null
    node = child
  }
  return node === doc.documentElement ? null : node
}

function fieldType(element: Element): string {
  return (element as HTMLInputElement).type ?? ''
}

function isTextField(element: Element): boolean {
  const tag = tagOf(element)
  if (tag === 'textarea') return true
  if (tag !== 'input') {
    return (element as HTMLElement).isContentEditable === true
  }
  return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'image'].includes(
    fieldType(element),
  )
}

function sameOriginTarget(doc: Document, anchor: Element): string | null {
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#')) return null
  try {
    const url = new URL(href, doc.location.href)
    if (url.origin !== doc.location.origin) return null
    if (url.pathname === doc.location.pathname && url.search === doc.location.search) return null
    return url.href
  } catch {
    return null
  }
}

function simulateClick(element: Element, doc: Document): void {
  const win = doc.defaultView
  if (!win) return
  const rect = element.getBoundingClientRect()
  const base = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: win,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    button: 0,
    detail: 1,
  }

  if (typeof win.PointerEvent === 'function') {
    const pointer = { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }
    element.dispatchEvent(new win.PointerEvent('pointerdown', { ...pointer, buttons: 1 }))
    element.dispatchEvent(new win.MouseEvent('mousedown', { ...base, buttons: 1 }))
    element.dispatchEvent(new win.PointerEvent('pointerup', { ...pointer, buttons: 0 }))
    element.dispatchEvent(new win.MouseEvent('mouseup', { ...base, buttons: 0 }))
  } else {
    element.dispatchEvent(new win.MouseEvent('mousedown', { ...base, buttons: 1 }))
    element.dispatchEvent(new win.MouseEvent('mouseup', { ...base, buttons: 0 }))
  }

  element.dispatchEvent(new win.MouseEvent('click', { ...base, buttons: 0 }))
}

function applyPayload(doc: Document, payload: MirrorPayload): void {
  const element = resolvePath(doc, payload.path)
  const win = doc.defaultView
  if (!element || !win) return

  if (payload.kind === 'click') {
    simulateClick(element, doc)
    return
  }

  if (payload.kind === 'input') {
    const tag = tagOf(element)
    if (tag === 'textarea' || tag === 'input') {
      const prototype = tag === 'textarea' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
      setter?.call(element, payload.value)
      element.dispatchEvent(new win.Event('input', { bubbles: true }))
      element.dispatchEvent(new win.Event('change', { bubbles: true }))
    }
    return
  }

  const init = {
    key: payload.key,
    code: payload.code,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: win,
  }
  element.dispatchEvent(new win.KeyboardEvent('keydown', init))
  element.dispatchEvent(new win.KeyboardEvent('keyup', init))

  if (payload.submit) {
    const form = element.closest('form')
    if (form && typeof (form as HTMLFormElement).requestSubmit === 'function') {
      ;(form as HTMLFormElement).requestSubmit()
    }
  }
}

function emit(sourceId: string, route: string, payload: MirrorPayload): void {
  for (const binding of bindings.values()) {
    if (binding.id === sourceId) continue
    const doc = readableDoc(binding.frame)
    if (!doc || routeOf(doc) !== route) continue
    applyPayload(doc, payload)
  }
}

export interface MirrorHandlers {
  onAvailability?: (available: boolean) => void
  onNavigate?: (href: string) => void
}

/** True when this frame's document can be read and scripted by us. */
export function isMirrorable(frame: HTMLIFrameElement): boolean {
  return readableDoc(frame) !== null
}

export function detachMirror(id: string): void {
  bindings.delete(id)
}

/**
 * Attach mirroring to one frame. Returns a cleanup function. Safe to call again
 * after an in-frame navigation.
 */
export function attachMirror(
  id: string,
  frame: HTMLIFrameElement,
  handlers: MirrorHandlers = {},
): () => void {
  const doc = readableDoc(frame)
  if (!doc || !doc.body) {
    handlers.onAvailability?.(false)
    return () => undefined
  }

  handlers.onAvailability?.(true)
  bindings.set(id, { id, frame })
  const route = routeOf(doc)

  const onClick = (event: MouseEvent) => {
    if (!event.isTrusted) return
    const target = event.target as Element | null
    if (!target || typeof target.closest !== 'function') return

    const anchor = target.closest('a[href]')
    if (anchor && handlers.onNavigate) {
      const href = sameOriginTarget(doc, anchor)
      if (href) {
        event.preventDefault()
        handlers.onNavigate(href)
        return
      }
    }

    const path = pathOf(target)
    if (path) emit(id, route, { kind: 'click', path })
  }

  const onInput = (event: Event) => {
    if (!event.isTrusted) return
    const target = event.target as Element | null
    if (!target || typeof target.closest !== 'function') return
    if (!isTextField(target)) return
    const path = pathOf(target)
    if (!path) return
    emit(id, route, {
      kind: 'input',
      path,
      value: (target as unknown as { value?: string }).value ?? '',
    })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.isTrusted) return
    const target = event.target as Element | null
    if (!target || typeof target.closest !== 'function') return
    if (isTextField(target) && event.key.length === 1) return
    const path = pathOf(target)
    if (!path) return
    emit(id, route, {
      kind: 'key',
      path,
      key: event.key,
      code: event.code,
      submit: event.key === 'Enter' && target.closest('form') !== null,
    })
  }

  doc.addEventListener('click', onClick, true)
  doc.addEventListener('input', onInput, true)
  doc.addEventListener('keydown', onKeyDown, true)

  return () => {
    doc.removeEventListener('click', onClick, true)
    doc.removeEventListener('input', onInput, true)
    doc.removeEventListener('keydown', onKeyDown, true)
    bindings.delete(id)
  }
}

/**
 * Binds mirroring to the frame's real document.
 *
 * An iframe starts on `about:blank`, and the first paint of the target page can
 * land after React commits. Binding early would attach the listeners to a document
 * that is thrown away, which is why nothing was mirrored. This waits for the loaded
 * document and re-binds after every in-frame navigation.
 */
export function attachMirrorWhenReady(
  id: string,
  frame: HTMLIFrameElement,
  handlers: MirrorHandlers = {},
): () => void {
  let detach: () => void = () => undefined
  let bound: Document | null = null
  let stopped = false
  let timer = 0
  let guard = 0

  const bind = (doc: Document) => {
    if (doc === bound) return
    detach()
    bound = doc
    detach = attachMirror(id, frame, handlers)
    window.clearInterval(timer)
    window.clearTimeout(guard)
  }

  const sync = () => {
    if (stopped) return
    const doc = readableDoc(frame)
    if (!doc) {
      handlers.onAvailability?.(false)
      window.clearInterval(timer)
      window.clearTimeout(guard)
      return
    }
    let href = ''
    try {
      href = doc.location.href
    } catch {
      href = ''
    }
    if (!href || href === 'about:blank' || doc.readyState !== 'complete' || !doc.body) return
    bind(doc)
  }

  const onLoad = () => sync()

  sync()
  frame.addEventListener('load', onLoad)
  timer = window.setInterval(sync, 350) as unknown as number
  guard = window.setTimeout(() => {
    if (!bound) {
      handlers.onAvailability?.(false)
      window.clearInterval(timer)
    }
  }, 14000) as unknown as number

  return () => {
    stopped = true
    window.clearInterval(timer)
    window.clearTimeout(guard)
    frame.removeEventListener('load', onLoad)
    detach()
    detachMirror(id)
  }
}
