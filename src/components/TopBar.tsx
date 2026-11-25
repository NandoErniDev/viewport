import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  Camera,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Focus,
  FolderOpen,
  Frame,
  Globe,
  History,
  Keyboard,
  Layers,
  LayoutGrid,
  Link2,
  Loader2,
  Minus,
  Monitor,
  Plus,
  RefreshCw,
  Rows3,
  Ruler,
  Settings2,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import type { Layout, WorkspaceMode } from '../lib/types'
import { useWorkspace, configFromState, resolvePreviewUrl } from '../lib/store'
import { buildShareUrl, cn, copyText, displayUrl, relativeTime } from '../lib/utils'
import { go } from '../lib/router'
import { IconButton, LogoMark, Popover, Segmented, Switch, Wordmark } from './ui'

interface TopBarProps {
  urlInputRef: RefObject<HTMLInputElement | null>
  onCaptureAll: () => void
  capturing: boolean
}

const ZOOM_STEPS = [0, 0.25, 0.33, 0.5, 0.67, 0.75, 1]

const LAYOUT_OPTIONS: Array<{ value: Layout; icon: typeof LayoutGrid; label: string }> = [
  { value: 'grid', icon: LayoutGrid, label: 'Grid (auto)' },
  { value: 'row', icon: Columns3, label: 'Horizontal columns' },
  { value: 'column', icon: Rows3, label: 'Vertical stack' },
  { value: 'freeform', icon: Frame, label: 'Freeform canvas' },
  { value: 'focus', icon: Focus, label: 'Focus one preview' },
]

export function TopBar({ urlInputRef, onCaptureAll, capturing }: TopBarProps) {
  const url = useWorkspace((state) => state.url)
  const previews = useWorkspace((state) => state.previews)
  const focusId = useWorkspace((state) => state.focusId)
  const layout = useWorkspace((state) => state.layout)
  const zoom = useWorkspace((state) => state.zoom)
  const mode = useWorkspace((state) => state.mode)
  const syncScroll = useWorkspace((state) => state.syncScroll)
  const syncInput = useWorkspace((state) => state.syncInput)
  const syncNav = useWorkspace((state) => state.syncNav)
  const showFrames = useWorkspace((state) => state.showFrames)
  const recent = useWorkspace((state) => state.recent)
  const panel = useWorkspace((state) => state.panel)

  const navigate = useWorkspace((state) => state.navigate)
  const reloadAll = useWorkspace((state) => state.reloadAll)
  const setLayout = useWorkspace((state) => state.setLayout)
  const setZoom = useWorkspace((state) => state.setZoom)
  const setMode = useWorkspace((state) => state.setMode)
  const setSyncScroll = useWorkspace((state) => state.setSyncScroll)
  const setSyncInput = useWorkspace((state) => state.setSyncInput)
  const setSyncNav = useWorkspace((state) => state.setSyncNav)
  const setShowFrames = useWorkspace((state) => state.setShowFrames)
  const setPanel = useWorkspace((state) => state.setPanel)
  const setFocus = useWorkspace((state) => state.setFocus)
  const toast = useWorkspace((state) => state.toast)

  const activeUrl = useMemo(() => {
    const focused = previews.find((preview) => preview.instanceId === focusId)
    return focused ? resolvePreviewUrl(focused, url) : url
  }, [previews, focusId, url])

  const [draft, setDraft] = useState(activeUrl)
  const [error, setError] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareValue, setShareValue] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (document.activeElement !== urlInputRef.current) {
      setDraft(activeUrl)
      setError(null)
    }
  }, [activeUrl, urlInputRef])

  const submit = (value?: string) => {
    const result = navigate(value ?? draft)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setDraft(result.url)
  }

  const openShare = () => {
    const config = configFromState(useWorkspace.getState())
    setShareValue(buildShareUrl(config))
    setShareOpen((open) => !open)
    setCopied(false)
  }

  const zoomLabel = zoom === 0 ? 'Fit' : `${Math.round(zoom * 100)}%`
  const zoomIndex = ZOOM_STEPS.indexOf(zoom)

  return (
    <header className="topbar">
      <div className="topbar__row">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            go('/')
          }}
          title="VIEWPORT home"
        >
          <span className="brand__mark">
            <LogoMark size={17} />
          </span>
          <Wordmark />
        </a>

        <div className={cn('url-bar', error && 'is-invalid')}>
          <Globe size={13} className="url-bar__icon" strokeWidth={1.7} />
          <input
            ref={urlInputRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
              if (event.key === 'Escape') {
                setDraft(activeUrl)
                setError(null)
                event.currentTarget.blur()
              }
            }}
            onFocus={(event) => event.currentTarget.select()}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            placeholder="Enter a URL — example.com"
            aria-label="Preview URL"
            aria-invalid={Boolean(error)}
          />
          {recent.length > 0 ? (
            <div className="popover-wrap">
              <IconButton
                icon={ChevronDown}
                label="Recently tested URLs"
                size="sm"
                active={recentOpen}
                onClick={() => setRecentOpen((open) => !open)}
              />
              <Popover open={recentOpen} onClose={() => setRecentOpen(false)} align="right" wide>
                <div className="popover__label">Recently tested</div>
                {recent.map((entry) => (
                  <button
                    key={entry.url}
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      setDraft(entry.url)
                      submit(entry.url)
                      setRecentOpen(false)
                    }}
                  >
                    <History size={13} />
                    <span className="menu-item__grow" style={{ overflow: 'hidden' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayUrl(entry.url)}
                      </span>
                      <span className="menu-item__hint">{relativeTime(entry.at)}</span>
                    </span>
                  </button>
                ))}
                <div className="menu-sep" />
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    useWorkspace.getState().clearRecent()
                    setRecentOpen(false)
                  }}
                >
                  <Trash2 size={13} /> Clear history
                </button>
              </Popover>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => submit()}
            title="Load this URL in every preview"
          >
            Preview
          </button>
          {error ? (
            <div className="url-bar__hint" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="topbar__actions">
          <IconButton icon={RefreshCw} label="Reload all previews (⌘R)" onClick={reloadAll} />
          <IconButton
            icon={capturing ? Loader2 : Camera}
            label={capturing ? 'Capturing…' : 'Capture screenshots'}
            onClick={onCaptureAll}
            disabled={capturing}
          />
          <IconButton
            icon={Layers}
            label="Compare captures"
            active={panel === 'compare'}
            onClick={() => setPanel(panel === 'compare' ? null : 'compare')}
          />
          <div className="popover-wrap">
            <IconButton icon={Share2} label="Share this workspace" active={shareOpen} onClick={openShare} />
            <Popover open={shareOpen} onClose={() => setShareOpen(false)} wide>
              <div className="popover__label">Share configuration</div>
              <p className="field-hint" style={{ padding: '0 10px 8px' }}>
                The link carries the URL, devices, layout, zoom and sync settings. Screenshots and
                saved sessions stay on this machine.
              </p>
              <input
                className="input input--mono"
                style={{ margin: '0 4px 8px', width: 'calc(100% - 8px)' }}
                readOnly
                value={shareValue}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                className="menu-item"
                onClick={async () => {
                  const ok = await copyText(shareValue)
                  setCopied(ok)
                  if (ok) toast('Share link copied to clipboard.', 'success')
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </Popover>
          </div>
          <IconButton icon={FolderOpen} label="Saved workspaces" onClick={() => setPanel('sessions')} />
          <IconButton icon={Keyboard} label="Keyboard shortcuts" onClick={() => setPanel('shortcuts')} />
          <IconButton icon={Settings2} label="Settings" onClick={() => setPanel('settings')} />
        </div>
      </div>

      <div className="topbar__row topbar__row--tools">
        <button
          type="button"
          className={cn('btn btn--outline', panel === 'devices' && 'is-active')}
          onClick={() => setPanel(panel === 'devices' ? null : 'devices')}
          title="Open device library"
        >
          <Monitor size={14} strokeWidth={1.7} />
          Devices
          <span className="badge" style={{ marginLeft: 2 }}>
            {previews.length}
          </span>
        </button>

        {mode === 'devices' ? (
          <>
            <div className="tool-group" style={{ marginLeft: 4 }}>
              <span className="tool-label">Layout</span>
              <div className="segmented" role="tablist" aria-label="Workspace layout">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={layout === option.value}
                    className={cn('segmented__item', layout === option.value && 'is-active')}
                    title={option.label}
                    onClick={() => setLayout(option.value)}
                  >
                    <option.icon size={13} strokeWidth={1.7} />
                  </button>
                ))}
              </div>
            </div>

            <div className="tool-group">
              <span className="tool-label">Zoom</span>
              <div className="popover-wrap">
                <div className="zoom-control">
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label="Zoom out"
                    onClick={() => {
                      const index = zoomIndex <= 0 ? 0 : zoomIndex
                      setZoom(ZOOM_STEPS[Math.max(0, index - 1)])
                    }}
                  >
                    <Minus size={12} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="zoom-control__value"
                    onClick={() => setZoomOpen((open) => !open)}
                    title="Preview zoom"
                  >
                    {zoomLabel}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label="Zoom in"
                    onClick={() => {
                      const index = zoomIndex < 0 ? 0 : zoomIndex
                      setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, index + 1)])
                    }}
                  >
                    <Plus size={12} strokeWidth={2} />
                  </button>
                </div>
                <Popover open={zoomOpen} onClose={() => setZoomOpen(false)}>
                  <div className="popover__label">Preview zoom</div>
                  {ZOOM_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className={cn('menu-item', zoom === step && 'is-active')}
                      onClick={() => {
                        setZoom(step)
                        setZoomOpen(false)
                      }}
                    >
                      <span className="menu-item__grow">
                        {step === 0 ? 'Fit to pane' : `${Math.round(step * 100)}%`}
                      </span>
                      {zoom === step ? <Check size={13} /> : null}
                    </button>
                  ))}
                  <p className="field-hint" style={{ padding: '6px 10px 4px' }}>
                    Fit scales each device to its pane. Fixed zoom keeps every preview at the same
                    scale for comparison.
                  </p>
                </Popover>
              </div>
            </div>
          </>
        ) : (
          <span className="badge" style={{ marginLeft: 4 }}>
            Breakpoint explorer
          </span>
        )}

        <div className="spacer" />

        <div className="popover-wrap">
          <button
            type="button"
            className={cn('btn btn--ghost btn--sm', syncOpen && 'is-active')}
            onClick={() => setSyncOpen((open) => !open)}
            title="Synchronisation settings"
          >
            <Link2 size={13} strokeWidth={1.8} />
            Sync
            {syncScroll || syncInput || !syncNav ? (
              <span className="status-dot" style={{ marginLeft: 2 }} />
            ) : null}
          </button>
          <Popover open={syncOpen} onClose={() => setSyncOpen(false)} wide>
            <div className="popover__label">Synchronisation</div>
            <div style={{ padding: '2px 4px 6px' }}>
              <Switch
                checked={syncInput}
                onChange={setSyncInput}
                label="Mirror clicks, typing and keys"
              >
                Clicks &amp; typing
              </Switch>
              <Switch checked={syncScroll} onChange={setSyncScroll} label="Scroll synchronisation">
                Scroll position
              </Switch>
              <Switch checked={syncNav} onChange={setSyncNav} label="Navigation synchronisation">
                Navigation
              </Switch>
            </div>
            <div className="menu-sep" />
            <button type="button" className="menu-item" onClick={reloadAll}>
              <RefreshCw size={13} /> Reload all previews
            </button>
            <p className="field-hint" style={{ padding: '8px 10px 4px' }}>
              A press, a typed character or a scroll happens once and is replayed into every preview
              of the same page. Browsers only expose same-origin documents, so a cross-origin site
              shows “No mirror” instead of pretending — no proxy, no injected script.
            </p>
          </Popover>
        </div>

        <IconButton
          icon={Frame}
          label={showFrames ? 'Hide device frames' : 'Show device frames'}
          active={showFrames}
          onClick={() => setShowFrames(!showFrames)}
        />

        <Segmented<WorkspaceMode>
          ariaLabel="Workspace mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'devices', label: 'Previews', icon: Monitor },
            { value: 'breakpoints', label: 'Breakpoints', icon: Ruler },
          ]}
        />

        {previews.length > 1 && layout !== 'focus' ? (
          <IconButton
            icon={Focus}
            label="Focus the selected preview"
            onClick={() => {
              setFocus(focusId ?? previews[0]?.instanceId ?? null)
              setLayout('focus')
            }}
          />
        ) : null}
        {layout === 'focus' ? (
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setLayout('grid')}>
            <X size={12} /> Exit focus
          </button>
        ) : null}
      </div>
    </header>
  )
}
