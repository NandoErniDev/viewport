import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Camera, Plus, RefreshCw, RotateCcw, X } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import { cn, displayUrl } from '../lib/utils'

const CARD_HEIGHT = 420

interface BreakpointViewProps {
  onCaptureAll: () => void
}

export function BreakpointView({ onCaptureAll }: BreakpointViewProps) {
  const url = useWorkspace((state) => state.url)
  const breakpoints = useWorkspace((state) => state.breakpoints)
  const breakpointHeight = useWorkspace((state) => state.breakpointHeight)
  const addBreakpoint = useWorkspace((state) => state.addBreakpoint)
  const removeBreakpoint = useWorkspace((state) => state.removeBreakpoint)
  const updateBreakpoint = useWorkspace((state) => state.updateBreakpoint)
  const setBreakpointHeight = useWorkspace((state) => state.setBreakpointHeight)
  const reloadAll = useWorkspace((state) => state.reloadAll)

  const [selected, setSelected] = useState<number | null>(breakpoints[0] ?? null)
  const [custom, setCustom] = useState('')
  const [nonce, setNonce] = useState(0)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const activeIndex = useMemo(() => {
    if (selected === null) return -1
    const index = breakpoints.indexOf(selected)
    return index >= 0 ? index : 0
  }, [breakpoints, selected])

  const activeWidth = activeIndex >= 0 ? breakpoints[activeIndex] : (breakpoints[0] ?? 375)
  const height = breakpointHeight
  const scale = Math.min(1, Math.max(0.12, CARD_HEIGHT / height))

  useEffect(() => {
    if (breakpoints.length === 0) {
      setSelected(null)
      return
    }
    if (selected === null || !breakpoints.includes(selected)) {
      setSelected(breakpoints[0])
    }
  }, [breakpoints, selected])

  const addCustom = () => {
    const value = Number(custom)
    if (!Number.isFinite(value) || value < 200 || value > 3840) {
      useWorkspace.getState().toast('Breakpoint width must be between 200 and 3840 px.', 'error')
      return
    }
    addBreakpoint(value)
    setSelected(Math.round(value))
    setCustom('')
  }

  return (
    <div className="bp">
      <div className="bp__bar">
        <div className="bp__chips">
          {breakpoints.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className={cn('bp-chip', value === activeWidth && 'is-active')}
            >
              <button
                type="button"
                className="bp-chip__body"
                onClick={() => setSelected(value)}
                title={`Select ${value}px`}
              >
                {value}
                <span style={{ opacity: 0.4, fontSize: 10 }}>px</span>
              </button>
              <button
                type="button"
                className="bp-chip__x"
                aria-label={`Remove ${value}px breakpoint`}
                onClick={() => removeBreakpoint(value)}
              >
                <X size={10} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>

        <div className="row" style={{ gap: 6 }}>
          <input
            className="input input--mono"
            style={{ width: 96, height: 26 }}
            placeholder="Add px"
            value={custom}
            inputMode="numeric"
            onChange={(event) => setCustom(event.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addCustom()
            }}
            aria-label="Add breakpoint width"
          />
          <button type="button" className="btn btn--outline btn--sm" onClick={addCustom}>
            <Plus size={12} strokeWidth={2} /> Add
          </button>
        </div>

        <div className="spacer" />

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onCaptureAll}
          title="Capture every breakpoint preview"
        >
          <Camera size={13} strokeWidth={1.8} /> Capture all
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setNonce((value) => value + 1)
            reloadAll()
          }}
          title="Reload every breakpoint"
        >
          <RefreshCw size={13} strokeWidth={1.8} /> Reload
        </button>
      </div>

      <div className="bp__rail" ref={scrollRef}>
        {breakpoints.length === 0 ? (
          <div className="empty-note" style={{ width: '100%' }}>
            No breakpoints yet — add one above to start.
          </div>
        ) : null}
        {breakpoints.map((width, index) => (
          <div
            key={index}
            className={cn('bp-card', width === activeWidth && 'is-selected')}
            onClick={() => setSelected(width)}
          >
            <div className="bp-card__head">
              <span className="bp-card__label">{width}px</span>
              <span className="bp-card__tag">{width < 640 ? 'phone' : width < 1024 ? 'tablet' : width < 1440 ? 'laptop' : 'desktop'}</span>
              <div className="spacer" />
              <a
                className="icon-btn icon-btn--sm"
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                title={`Open ${displayUrl(url)} in a new tab`}
                onClick={(event) => event.stopPropagation()}
              >
                <ArrowUpRight size={13} strokeWidth={1.8} />
              </a>
            </div>
            <div
              className="bp-card__shell"
              style={{ width: width * scale, height: height * scale }}
              data-breakpoint={width}
            >
              <iframe
                key={`${url}-${nonce}`}
                src={url}
                title={`${width}px breakpoint preview`}
                style={{ width, height, transform: `scale(${scale})` }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', padding: '0 2px' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {width} × {height}
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>
        ))}
        {breakpoints.length > 0 ? (
          <div className="empty-note" style={{ minWidth: 140 }}>
            <RotateCcw size={16} strokeWidth={1.5} />
            Drag the width slider below to watch a layout reflow.
          </div>
        ) : null}
      </div>

      <div className="bp__width-bar">
        <div className="row" style={{ gap: 8 }}>
          <span className="tool-label" style={{ margin: 0 }}>
            Live
          </span>
          <span className="bp__width-value">
            {activeWidth}
            <span style={{ color: 'var(--text-3)', fontSize: 10 }}> px</span>
          </span>
        </div>

        <div className="bp__slider-wrap">
          <input
            className="range"
            type="range"
            min={200}
            max={1920}
            step={1}
            value={activeWidth}
            aria-label="Breakpoint width"
            onChange={(event) => {
              const value = Number(event.target.value)
              if (activeIndex >= 0) {
                updateBreakpoint(activeIndex, value)
                setSelected(value)
              }
            }}
          />
          <div className="bp__ruler">
            {[320, 375, 430, 640, 768, 1024, 1280, 1440, 1920].map((tick) => (
              <span
                key={tick}
                className="bp__tick"
                style={{ left: `${((tick - 200) / 1720) * 100}%` }}
              >
                <span className="bp__tick-label">{tick}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 6, minWidth: 210 }}>
          <span className="tool-label" style={{ margin: 0 }}>
            Height
          </span>
          <input
            className="input input--mono"
            type="number"
            min={320}
            max={2000}
            step={10}
            value={height}
            style={{ width: 78, height: 26 }}
            aria-label="Breakpoint preview height"
            onChange={(event) => setBreakpointHeight(Number(event.target.value))}
          />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
            live
          </span>
        </div>
      </div>
    </div>
  )
}
