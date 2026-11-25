import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowUpRight,
  Camera,
  Info,
  Link2,
  Link2Off,
  Maximize2,
  Minimize2,
  MousePointerClick,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  X,
} from 'lucide-react'
import type { Layout, Preview, Rect } from '../lib/types'
import { cn, displayUrl } from '../lib/utils'
import { useWorkspace } from '../lib/store'
import { attachScrollSync, registerPane } from '../lib/sync'
import { attachMirrorWhenReady, type MirrorHandlers } from '../lib/mirror'
import { checkEmbedding, type FrameVerdict } from '../lib/frameHealth'
import { framedSize } from '../lib/devices'
import { IconButton, Popover } from './ui'

interface PreviewPaneProps {
  preview: Preview
  workspaceUrl: string
  zoom: number
  isFocused: boolean
  layout: Layout
  showFrames: boolean
  syncScroll: boolean
  syncInput: boolean
  rect?: Rect
  onRectChange: (rect: Rect) => void
  onScrolled: (instanceId: string, ratio: number) => void
  onCapture: (instanceId: string) => void
  onFrameNavigate: (href: string) => void
}

function clampScale(value: number): number {
  return Math.min(1, Math.max(0.04, value))
}

const SLOW_LOAD_MS = 9000

export const PreviewPane = memo(function PreviewPane({
  preview,
  workspaceUrl,
  zoom,
  isFocused,
  layout,
  showFrames,
  syncScroll,
  syncInput,
  rect,
  onRectChange,
  onScrolled,
  onCapture,
  onFrameNavigate,
}: PreviewPaneProps) {
  const url = preview.url ?? workspaceUrl
  const externalUrl = url.startsWith('/') ? new URL(url, window.location.href).toString() : url

  const paneRef = useRef<HTMLElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const reloadPreview = useWorkspace((state) => state.reloadPreview)
  const removePreview = useWorkspace((state) => state.removePreview)
  const rotatePreview = useWorkspace((state) => state.rotatePreview)
  const setFocus = useWorkspace((state) => state.setFocus)
  const setPreviewUrl = useWorkspace((state) => state.setPreviewUrl)

  const [loaded, setLoaded] = useState(false)
  const [stalled, setStalled] = useState(false)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [embedHelpOpen, setEmbedHelpOpen] = useState(false)
  const [syncAvailable, setSyncAvailable] = useState<boolean | null>(null)
  const [mirrorAvailable, setMirrorAvailable] = useState<boolean | null>(null)
  const [verdict, setVerdict] = useState<FrameVerdict | null>(null)
  const [verdictDismissed, setVerdictDismissed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [dragRect, setDragRect] = useState<Rect | null>(null)
  const dragRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; base: Rect } | null>(
    null,
  )

  const effectiveFrame = showFrames ? preview.frameStyle : 'none'
  const { width: outerWidth, height: outerHeight, spec } = useMemo(
    () => framedSize({ ...preview, frameStyle: effectiveFrame }),
    [preview, effectiveFrame],
  )

  /* ------------------------------------------------------------- scale */

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // `stageSize` is the canvas content box, so only a small gutter is subtracted.
  const fitScale = clampScale(
    Math.min(
      (Math.max(stageSize.width, 120) - 14) / outerWidth,
      (Math.max(stageSize.height, 120) - 14) / outerHeight,
    ),
  )
  const scale = zoom === 0 ? fitScale : zoom

  /* ------------------------------------------------------------- loading */

  useEffect(() => {
    setLoaded(false)
    setStalled(false)
    setNoticeDismissed(false)
    setVerdict(null)
    setVerdictDismissed(false)
    setMirrorAvailable(null)
  }, [url, preview.nonce])

  useEffect(() => {
    if (loaded) {
      setStalled(false)
      return
    }
    const timer = window.setTimeout(() => setStalled(true), SLOW_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [loaded, url, preview.nonce])

  /* -------------------------------------------------------- frame health */

  useEffect(() => {
    let cancelled = false
    setVerdict(null)
    checkEmbedding(url).then((result) => {
      if (cancelled) return
      if (result.state === 'blocked' || result.state === 'unreachable') setVerdict(result)
    })
    return () => {
      cancelled = true
    }
  }, [url, preview.nonce])

  /* --------------------------------------------------------- scroll sync */

  useEffect(() => {
    const frame = iframeRef.current
    if (!frame) return
    registerPane(preview.instanceId, frame)

    if (!syncScroll) {
      setSyncAvailable(null)
      return () => registerPane(preview.instanceId, null)
    }

    const detach = attachScrollSync(preview.instanceId, frame, {
      onScroll: (ratio) => onScrolled(preview.instanceId, ratio),
      onAvailability: setSyncAvailable,
    })

    return () => {
      detach()
      registerPane(preview.instanceId, null)
    }
  }, [syncScroll, preview.instanceId, preview.nonce, url, onScrolled])

  /* ------------------------------------------------------- input mirror */

  useEffect(() => {
    const frame = iframeRef.current
    if (!frame) return

    if (!syncInput) {
      setMirrorAvailable(null)
      return
    }

    const handlers: MirrorHandlers = {
      onAvailability: setMirrorAvailable,
      onNavigate: onFrameNavigate,
    }

    return attachMirrorWhenReady(preview.instanceId, frame, handlers)
  }, [syncInput, preview.instanceId, preview.nonce, url, onFrameNavigate])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === paneRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  /* ----------------------------------------------------------- freeform */

  const beginDrag = useCallback(
    (event: React.PointerEvent, mode: 'move' | 'resize') => {
      if (layout !== 'freeform') return
      if (mode === 'move' && (event.target as HTMLElement).closest('button, a, input')) return
      const base = rect ?? { x: 24, y: 24, w: 420, h: 560 }
      dragRef.current = { mode, startX: event.clientX, startY: event.clientY, base }
      setDragRect(base)
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      event.preventDefault()
    },
    [layout, rect],
  )

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (drag.mode === 'move') {
      setDragRect({ ...drag.base, x: Math.max(0, drag.base.x + dx), y: Math.max(0, drag.base.y + dy) })
    } else {
      setDragRect({
        ...drag.base,
        w: Math.max(260, drag.base.w + dx),
        h: Math.max(220, drag.base.h + dy),
      })
    }
  }, [])

  const endDrag = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragRect((current) => {
      if (current) onRectChange(current)
      return null
    })
  }, [onRectChange])

  const freeformStyle: CSSProperties | undefined =
    layout === 'freeform'
      ? (() => {
          const box = dragRect ?? rect ?? { x: 24, y: 24, w: 440, h: 580 }
          return { left: box.x, top: box.y, width: box.w, height: box.h }
        })()
      : undefined

  const blocked = verdict !== null && !verdictDismissed
  const slow = stalled && !loaded && !noticeDismissed && !blocked

  return (
    <section
      ref={paneRef}
      data-preview-id={preview.instanceId}
      className={cn(
        'pane',
        isFocused && 'is-focused',
        layout === 'freeform' && 'pane--free',
        dragRect && 'pane--dragging',
      )}
      style={freeformStyle}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('.pane__head')) setFocus(preview.instanceId)
      }}
    >
      <header
        className="pane__head"
        onPointerDown={(event) => beginDrag(event, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="pane__id">
          <span className="pane__dot" aria-hidden="true" />
          <span className="pane__name" title={preview.name}>
            {preview.name}
          </span>
          <span className="pane__dims mono">
            {Math.round(preview.width)}×{Math.round(preview.height)}
          </span>
          {preview.url ? (
            <span className="badge" title={`This preview has its own URL: ${preview.url}`}>
              own url
            </span>
          ) : null}
        </div>
        <div className="pane__actions">
          <IconButton
            icon={RotateCw}
            label="Rotate orientation"
            size="sm"
            onClick={() => rotatePreview(preview.instanceId)}
          />
          <IconButton
            icon={RefreshCw}
            label="Reload this preview"
            size="sm"
            onClick={() => reloadPreview(preview.instanceId)}
          />
          <IconButton
            icon={Camera}
            label="Capture this preview"
            size="sm"
            onClick={() => onCapture(preview.instanceId)}
          />
          <IconButton icon={ArrowUpRight} label="Open site in a new tab" size="sm" href={externalUrl} />
          <IconButton
            icon={fullscreen ? Minimize2 : Maximize2}
            label={fullscreen ? 'Exit fullscreen' : 'Fullscreen this preview'}
            size="sm"
            onClick={async () => {
              if (document.fullscreenElement) await document.exitFullscreen()
              else await paneRef.current?.requestFullscreen().catch(() => undefined)
            }}
          />
          <IconButton
            icon={X}
            label="Remove preview"
            size="sm"
            onClick={() => removePreview(preview.instanceId)}
          />
        </div>
      </header>

      <div className="pane__canvas" ref={stageRef}>
        <div
          className="pane__frame"
          style={{ width: outerWidth * scale, height: outerHeight * scale }}
        >
          <div
            className={cn('device', `device--${spec.tone}`)}
            style={{
              width: outerWidth,
              height: outerHeight,
              padding: `${spec.pad}px ${spec.pad}px ${spec.pad + spec.chin}px`,
              borderRadius: spec.bodyRadius,
              ['--body-r' as string]: `${spec.bodyRadius}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {spec.buttons ? (
              <span className="device__buttons" aria-hidden="true">
                <i className="device__btn device__btn--silent" />
                <i className="device__btn device__btn--vol-up" />
                <i className="device__btn device__btn--vol-down" />
                <i className="device__btn device__btn--power" />
              </span>
            ) : null}

            {spec.camera ? <span className="device__camera" aria-hidden="true" /> : null}

            <div
              className="device__screen"
              data-capture={preview.instanceId}
              style={{
                width: preview.width,
                height: preview.height,
                borderRadius: spec.screenRadius,
              }}
            >
              <iframe
                key={`${url}-${preview.nonce}`}
                ref={iframeRef}
                src={url}
                title={`${preview.name} preview of ${displayUrl(url)}`}
                style={{ width: preview.width, height: preview.height }}
                onLoad={() => setLoaded(true)}
                referrerPolicy="no-referrer-when-downgrade"
                allow="fullscreen; clipboard-read; clipboard-write"
              />

              {spec.island === 'dynamic' ? (
                <span className="device__island" aria-hidden="true" />
              ) : null}
              {spec.island === 'notch' ? <span className="device__notch" aria-hidden="true" /> : null}

              {blocked ? <div className="device__shield" aria-hidden="true" /> : null}
            </div>
          </div>
        </div>

        {!loaded && !blocked ? (
          <div className="pane__loader">
            <div className="spinner" aria-hidden="true" />
            <span>Loading {displayUrl(url)}…</span>
          </div>
        ) : null}

        {blocked ? (
          <div className="pane__notice pane__notice--blocked" role="status">
            <ShieldAlert size={14} strokeWidth={1.8} />
            <div style={{ flex: 1 }}>
              <strong>{new URL(externalUrl).host} refuses to be embedded</strong>
              {verdict && verdict.detail ? <span className="mono">{verdict.detail}</span> : null}
              {verdict && verdict.state === 'unreachable'
                ? ' The site did not answer. It may be offline, slow, or blocking requests.'
                : ' Browsers refuse to render it in any iframe, which is why the frame stays blank. That is a property of the site, not of VIEWPORT.'}
              <div className="pane__notice-actions">
                <a href={externalUrl} target="_blank" rel="noreferrer noopener">
                  Open in a new tab
                </a>
                <button
                  type="button"
                  className="link"
                  onClick={() => reloadPreview(preview.instanceId)}
                >
                  Try again
                </button>
                <button type="button" className="link" onClick={() => setVerdictDismissed(true)}>
                  Show the frame anyway
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {slow ? (
          <div className="pane__notice" role="status">
            <Info size={14} strokeWidth={1.8} />
            <div style={{ flex: 1 }}>
              <strong>This preview is taking a while</strong>
              The site may be slow, offline, or blocking embedding with X-Frame-Options or a CSP
              frame-ancestors rule.
              <div className="pane__notice-actions">
                <a href={externalUrl} target="_blank" rel="noreferrer noopener">
                  Open in a new tab
                </a>
                <button type="button" className="link" onClick={() => setNoticeDismissed(true)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="pane__foot">
        <div className="pane__foot-group">
          <span className="mono">{Math.round(scale * 100)}%</span>
          <span aria-hidden="true">·</span>
          <span className="mono">@{preview.dpr}x</span>
          <span aria-hidden="true">·</span>
          <span className="mono">{preview.orientation}</span>
        </div>
        <div className="pane__foot-group">
          {syncInput ? (
            <span
              className={cn(
                'sync-pill',
                mirrorAvailable === true && 'is-on',
                mirrorAvailable === false && 'is-unavailable',
                mirrorAvailable === null && 'is-pending',
              )}
              title={
                mirrorAvailable === false
                  ? 'Input mirroring needs a same-origin preview: browsers do not expose the contents of a cross-origin frame, so no tool can replay a click into it.'
                  : mirrorAvailable === true
                    ? 'Clicks, typing and keys are mirrored with every preview of the same page.'
                    : 'Checking whether this frame can be mirrored…'
              }
            >
              {mirrorAvailable === false ? <Link2Off size={11} /> : <MousePointerClick size={11} />}
              {mirrorAvailable === false ? 'No mirror' : mirrorAvailable === true ? 'Mirrored' : 'Mirror…'}
            </span>
          ) : null}
          {syncScroll ? (
            <span
              className={cn(
                'sync-pill',
                syncAvailable === true && 'is-on',
                syncAvailable === false && 'is-unavailable',
                syncAvailable === null && 'is-pending',
              )}
              title={
                syncAvailable === false
                  ? 'Scroll sync is unavailable: browsers block reading scroll position inside cross-origin frames.'
                  : syncAvailable === true
                    ? 'Scroll position is synchronised with other accessible previews.'
                    : 'Checking whether this frame allows scroll synchronisation…'
              }
            >
              {syncAvailable === false ? <Link2Off size={11} /> : <Link2 size={11} />}
              {syncAvailable === false ? 'No sync' : syncAvailable === true ? 'Synced' : 'Sync…'}
            </span>
          ) : null}
          <div className="popover-wrap">
            <button
              type="button"
              className="pane__foot-btn"
              onClick={() => setEmbedHelpOpen((open) => !open)}
              title="Preview looks blank?"
            >
              Blank?
            </button>
            <Popover
              open={embedHelpOpen}
              onClose={() => setEmbedHelpOpen(false)}
              wide
              align="right"
            >
              <div className="popover__label">If the frame is empty</div>
              <p className="field-hint" style={{ padding: '0 10px 8px' }}>
                Many sites set <code>X-Frame-Options</code> or a CSP <code>frame-ancestors</code> rule
                that stops other domains from embedding them. VIEWPORT reads those headers and names
                the rule instead of bypassing it.
              </p>
              <a className="menu-item" href={externalUrl} target="_blank" rel="noreferrer noopener">
                <ArrowUpRight size={13} /> Open the site in a new tab
              </a>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setPreviewUrl(preview.instanceId, null)
                  setEmbedHelpOpen(false)
                }}
              >
                <RefreshCw size={13} /> Follow the workspace URL again
              </button>
            </Popover>
          </div>
        </div>
      </footer>

      {layout === 'freeform' ? (
        <div
          className="pane__resize"
          role="separator"
          aria-label="Resize preview"
          onPointerDown={(event) => beginDrag(event, 'resize')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      ) : null}
    </section>
  )
})
