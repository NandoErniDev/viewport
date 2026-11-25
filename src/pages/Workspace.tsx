import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Info, MousePointerClick } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { PreviewPane } from '../components/PreviewPane'
import { DeviceLibrary } from '../components/DeviceLibrary'
import { BreakpointView } from '../components/BreakpointView'
import { SessionsPanel } from '../components/SessionsPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { ShortcutsDialog } from '../components/ShortcutsDialog'
import { ComparePanel } from '../components/ComparePanel'
import { CustomDeviceDialog } from '../components/CustomDeviceDialog'
import { ToastHost, isMac } from '../components/ui'
import { useWorkspace, resolvePreviewUrl } from '../lib/store'
import { acquireDisplayStream, captureRegion, isCaptureSupported, stopStream } from '../lib/capture'
import { writeScrollRatio } from '../lib/sync'
import { decodeConfig, displayUrl, isEditableTarget, normalizeUrl, uid } from '../lib/utils'
import { replacePath } from '../lib/router'
import type { Preview, Rect } from '../lib/types'

function defaultRect(index: number): Rect {
  const column = index % 3
  const row = Math.floor(index / 3)
  return { x: 24 + column * 44, y: 24 + row * 44, w: 460, h: 600 }
}

export function Workspace() {
  const url = useWorkspace((state) => state.url)
  const previews = useWorkspace((state) => state.previews)
  const layout = useWorkspace((state) => state.layout)
  const zoom = useWorkspace((state) => state.zoom)
  const focusId = useWorkspace((state) => state.focusId)
  const mode = useWorkspace((state) => state.mode)
  const panel = useWorkspace((state) => state.panel)
  const syncScroll = useWorkspace((state) => state.syncScroll)
  const syncInput = useWorkspace((state) => state.syncInput)
  const showFrames = useWorkspace((state) => state.showFrames)
  const navigate = useWorkspace((state) => state.navigate)

  const setLayout = useWorkspace((state) => state.setLayout)
  const setPreviewPos = useWorkspace((state) => state.setPreviewPos)
  const setMode = useWorkspace((state) => state.setMode)
  const setPanel = useWorkspace((state) => state.setPanel)
  const reloadAll = useWorkspace((state) => state.reloadAll)
  const setFocus = useWorkspace((state) => state.setFocus)
  const addCapture = useWorkspace((state) => state.addCapture)
  const toast = useWorkspace((state) => state.toast)
  const applyConfig = useWorkspace((state) => state.applyConfig)
  const saveSession = useWorkspace((state) => state.saveSession)

  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturing, setCapturing] = useState(false)

  /* --------------------------------------------------- incoming deep links */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('w')
    const direct = params.get('url')

    if (encoded) {
      const config = decodeConfig(encoded)
      if (config) {
        applyConfig(config)
      } else {
        toast('That share link could not be read.', 'error')
      }
    } else if (direct) {
      const result = normalizeUrl(direct)
      if (result.ok) {
        useWorkspace.getState().navigate(result.url)
      } else {
        toast(result.error, 'error')
      }
    }
    if (encoded || direct) replacePath('/workspace')
  }, [applyConfig, toast])

  /* ------------------------------------------------------------- capture */

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    const existing = streamRef.current
    if (existing && existing.getVideoTracks().some((track) => track.readyState === 'live')) {
      return existing
    }
    const stream = await acquireDisplayStream()
    streamRef.current = stream
    const track = stream.getVideoTracks()[0]
    if (track) {
      track.addEventListener('ended', () => {
        streamRef.current = null
      })
    }
    return stream
  }, [])

  const captureTargets = useCallback(
    async (targets: Array<{ element: HTMLElement; preview?: Preview; label: string }>) => {
      if (!isCaptureSupported()) {
        toast(
          'Screenshots need browser display capture (https, Chrome, Edge or Safari). It is unavailable here.',
          'error',
        )
        return
      }
      setCapturing(true)
      let count = 0
      try {
        const stream = await ensureStream()
        for (const target of targets) {
          try {
            const region = await captureRegion(stream, target.element)
            addCapture({
              id: uid('cap'),
              label: target.label,
              device: target.preview?.name ?? target.label,
              url: target.preview ? displayUrl(resolvePreviewUrl(target.preview, url)) : displayUrl(url),
              dataUrl: region.dataUrl,
              width: target.preview?.width ?? region.width,
              height: target.preview?.height ?? region.height,
              createdAt: Date.now(),
            })
            count += 1
          } catch (error) {
            toast(error instanceof Error ? error.message : 'That preview could not be captured.', 'error')
          }
        }
        if (count > 0) {
          toast(
            `${count} capture${count === 1 ? '' : 's'} ready. Compare or download them below.`,
            'success',
          )
          setPanel('compare')
        } else {
          toast('Nothing captured. Keep the preview on screen, then try again.', 'error')
        }
      } catch (error) {
        const denied = error instanceof Error && error.name === 'NotAllowedError'
        toast(
          denied
            ? 'Screen capture was cancelled.'
            : error instanceof Error
              ? error.message
              : 'Screen capture failed.',
          'error',
        )
      } finally {
        setCapturing(false)
      }
    },
    [addCapture, ensureStream, setPanel, toast, url],
  )

  const captureAll = useCallback(() => {
    const state = useWorkspace.getState()
    if (state.mode === 'breakpoints') {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-breakpoint]'),
      ).map((element) => ({
        element,
        label: `${element.dataset.breakpoint}px breakpoint`,
      }))
      void captureTargets(elements)
      return
    }
    const targets = state.previews
      .map((preview) => {
        const element = document.querySelector<HTMLElement>(`[data-capture="${preview.instanceId}"]`)
        return element ? { element, preview, label: `${preview.name} — ${Math.round(preview.width)}×${Math.round(preview.height)}` } : null
      })
      .filter((item): item is { element: HTMLElement; preview: Preview; label: string } => item !== null)
    void captureTargets(targets)
  }, [captureTargets])

  const captureOne = useCallback(
    (instanceId: string) => {
      const state = useWorkspace.getState()
      const preview = state.previews.find((item) => item.instanceId === instanceId)
      const element = document.querySelector<HTMLElement>(`[data-capture="${instanceId}"]`)
      if (!preview || !element) {
        toast('That preview is not on screen right now.', 'error')
        return
      }
      void captureTargets([
        {
          element,
          preview,
          label: `${preview.name} — ${Math.round(preview.width)}×${Math.round(preview.height)}`,
        },
      ])
    },
    [captureTargets, toast],
  )

  useEffect(() => () => stopStream(streamRef.current), [])

  /* --------------------------------------------------------- mirroring */

  // A same-origin link pressed inside one preview moves every preview to that page.
  const handleFrameNavigate = useCallback(
    (href: string) => {
      navigate(href)
    },
    [navigate],
  )

  /* --------------------------------------------------------- scroll sync */

  const handleScrolled = useCallback((sourceId: string, ratio: number) => {
    const state = useWorkspace.getState()
    if (!state.syncScroll) return
    state.previews.forEach((preview) => {
      if (preview.instanceId !== sourceId) writeScrollRatio(preview.instanceId, ratio)
    })
  }, [])

  /* ----------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = isMac ? event.metaKey : event.ctrlKey
      const key = event.key

      if (mod && key.toLowerCase() === 'k') {
        event.preventDefault()
        urlInputRef.current?.focus()
        urlInputRef.current?.select()
        return
      }
      if (mod && key.toLowerCase() === 'r') {
        event.preventDefault()
        reloadAll()
        toast('Reloading all previews.', 'info')
        return
      }
      if (mod && key.toLowerCase() === 's') {
        event.preventDefault()
        saveSession(`Workspace ${new Date().toLocaleTimeString()}`)
        return
      }
      if (key === 'Escape' && useWorkspace.getState().panel === 'devices') {
        setPanel(null)
        return
      }
      if (isEditableTarget(event.target) || mod) return

      switch (key) {
        case '1':
          setLayout('focus')
          if (!useWorkspace.getState().focusId) setFocus(useWorkspace.getState().previews[0]?.instanceId ?? null)
          break
        case '2':
        case '3': {
          const count = Number(key)
          const state = useWorkspace.getState()
          if (state.previews.length < count) {
            toast(`Add another device to use a ${count}-column layout.`, 'info')
            break
          }
          setLayout('row')
          break
        }
        case '4':
          setLayout('grid')
          break
        case 'f':
        case 'F': {
          const state = useWorkspace.getState()
          const id = state.focusId ?? state.previews[0]?.instanceId
          const pane = id ? document.querySelector<HTMLElement>(`[data-preview-id="${id}"]`) : null
          if (document.fullscreenElement) void document.exitFullscreen()
          else void pane?.requestFullscreen().catch(() => undefined)
          break
        }
        case 'b':
        case 'B':
          setMode(useWorkspace.getState().mode === 'breakpoints' ? 'devices' : 'breakpoints')
          break
        case 'g':
        case 'G':
          setPanel(useWorkspace.getState().panel === 'devices' ? null : 'devices')
          break
        case '?':
          setPanel('shortcuts')
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reloadAll, saveSession, setFocus, setLayout, setMode, setPanel, toast])

  /* ------------------------------------------------------------- layouts */

  const focusPreview = useMemo(
    () => previews.find((preview) => preview.instanceId === focusId) ?? previews[0],
    [previews, focusId],
  )

  const gridColumns = useMemo(() => {
    const count = previews.length
    if (count <= 1) return 1
    if (count === 2) return 2
    if (count === 3) return 3
    if (count === 4) return 2
    if (count <= 6) return 3
    return 4
  }, [previews.length])

  const freeformMinHeight = useMemo(() => {
    return previews.reduce((height, preview, index) => {
      const box = preview.pos ?? defaultRect(index)
      return Math.max(height, box.y + box.h + 32)
    }, 640)
  }, [previews])

  const renderPane = (preview: Preview, index: number) => (
    <PreviewPane
      key={preview.instanceId}
      preview={preview}
      workspaceUrl={url}
      zoom={zoom}
      isFocused={preview.instanceId === (focusId ?? focusPreview?.instanceId)}
      layout={layout}
      showFrames={showFrames}
      syncScroll={syncScroll}
      syncInput={syncInput}
      onFrameNavigate={handleFrameNavigate}
      rect={layout === 'freeform' ? (preview.pos ?? defaultRect(index)) : undefined}
      onRectChange={(rect) => setPreviewPos(preview.instanceId, rect)}
      onScrolled={handleScrolled}
      onCapture={captureOne}
    />
  )

  return (
    <div className="app">
      <TopBar urlInputRef={urlInputRef} onCaptureAll={captureAll} capturing={capturing} />

      <div className="mobile-hint">
        <Info size={13} strokeWidth={1.8} />
        Desktop gives you the full multi-device workspace. On mobile, previews stack one per screen.
      </div>

      <main className="workspace">
        <div className="workspace__canvas">
          {mode === 'breakpoints' ? (
            <BreakpointView onCaptureAll={captureAll} />
          ) : layout === 'focus' ? (
            <div className="layout layout--focus">{focusPreview ? renderPane(focusPreview, 0) : null}</div>
          ) : layout === 'freeform' ? (
            <div className="layout layout--freeform" style={{ minHeight: freeformMinHeight }}>
              {previews.map(renderPane)}
            </div>
          ) : (
            <div
              className={`layout layout--${layout}`}
              style={
                layout === 'grid'
                  ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }
                  : undefined
              }
            >
              {previews.map(renderPane)}
            </div>
          )}
        </div>

        {panel === 'devices' ? <DeviceLibrary /> : null}
      </main>

      <div className="workspace__status">
        <span className="status-dot" />
        <span>{previews.length} live preview{previews.length === 1 ? '' : 's'}</span>
        <span aria-hidden="true">·</span>
        <span className="mono">{displayUrl(url)}</span>
        <span className="spacer" />
        <span className="row" style={{ gap: 5 }}>
          <MousePointerClick size={11} strokeWidth={1.8} />
          {layout} layout
        </span>
        <span aria-hidden="true">·</span>
        <span>{syncScroll ? 'Scroll sync on' : 'Scroll sync off'}</span>
        <span aria-hidden="true">·</span>
        <span>Local-first · nothing uploaded</span>
      </div>

      <SessionsPanel />
      <SettingsPanel />
      <ShortcutsDialog />
      <ComparePanel onCaptureAll={captureAll} capturing={capturing} />
      <CustomDeviceDialog />
      <ToastHost />
    </div>
  )
}
