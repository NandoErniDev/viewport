import { useEffect, useState } from 'react'
import { Camera, Download, Image as ImageIcon, Loader2, Layers, Trash2 } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import { diffCaptures, diffRatio } from '../lib/capture'
import { downloadDataUrl, cn, slugify } from '../lib/utils'
import { Modal, Segmented } from './ui'

type CompareMode = 'side' | 'overlay' | 'diff'

interface ComparePanelProps {
  onCaptureAll: () => void
  capturing: boolean
}

export function ComparePanel({ onCaptureAll, capturing }: ComparePanelProps) {
  const panel = useWorkspace((state) => state.panel)
  const captures = useWorkspace((state) => state.captures)
  const removeCapture = useWorkspace((state) => state.removeCapture)
  const clearCaptures = useWorkspace((state) => state.clearCaptures)
  const capturePrefix = useWorkspace((state) => state.capturePrefix)
  const setPanel = useWorkspace((state) => state.setPanel)

  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)
  const [mode, setMode] = useState<CompareMode>('side')
  const [opacity, setOpacity] = useState(55)
  const [diffImage, setDiffImage] = useState<string | null>(null)
  const [diffPercent, setDiffPercent] = useState<number | null>(null)
  const [working, setWorking] = useState(false)

  const a = captures.find((capture) => capture.id === aId) ?? null
  const b = captures.find((capture) => capture.id === bId) ?? null

  useEffect(() => {
    if (captures.length === 0) {
      setAId(null)
      setBId(null)
      return
    }
    if (!aId || !captures.some((capture) => capture.id === aId)) {
      setAId(captures[Math.min(1, captures.length - 1)].id)
    }
    if (captures.length > 1 && (!bId || !captures.some((capture) => capture.id === bId))) {
      setBId(captures[0].id)
    }
  }, [captures, aId, bId])

  useEffect(() => {
    if (mode !== 'diff' || !a || !b) {
      setDiffImage(null)
      setDiffPercent(null)
      return
    }
    let cancelled = false
    setWorking(true)
    Promise.all([diffCaptures(a, b), diffRatio(a, b)])
      .then(([image, percent]) => {
        if (cancelled) return
        setDiffImage(image)
        setDiffPercent(percent)
      })
      .catch(() => {
        if (!cancelled) setDiffImage(null)
      })
      .finally(() => {
        if (!cancelled) setWorking(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, a, b])

  const filename = (capture: NonNullable<typeof a>, suffix = '') =>
    `${capturePrefix || 'viewport'}-${slugify(capture.device)}-${Math.round(capture.width)}x${Math.round(
      capture.height,
    )}${suffix}.png`

  const pick = (id: string, slot: 'a' | 'b') => {
    if (slot === 'a') setAId(id)
    else setBId(id)
  }

  return (
    <Modal
      open={panel === 'compare'}
      onClose={() => setPanel(null)}
      title="Compare screens"
      subtitle="Captured from your display at render resolution — actual pixels, not re-rendered mockups."
      icon={Layers}
      size="wide"
    >
      <div className="cmp">
        <div className="cmp__side">
          <div className="cmp__side-head">
            <span>Captures · {captures.length}</span>
            {captures.length > 0 ? (
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                title="Discard all captures"
                aria-label="Discard all captures"
                onClick={clearCaptures}
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </div>
          <div className="cmp__list">
            {captures.length === 0 ? (
              <div className="empty-note" style={{ padding: '24px 10px' }}>
                <Camera size={18} strokeWidth={1.5} />
                No captures yet.
              </div>
            ) : null}
            {captures.map((capture) => (
              <div
                key={capture.id}
                className={cn(
                  'cmp-thumb',
                  capture.id === aId && 'is-a',
                  capture.id === bId && 'is-b',
                )}
              >
                <div className="cmp-thumb__img">
                  <img src={capture.dataUrl} alt={`${capture.device} capture`} />
                </div>
                <div className="cmp-thumb__body">
                  <span className="cmp-thumb__name" title={capture.label}>
                    {capture.device}
                  </span>
                  <span className="cmp-thumb__meta">
                    {capture.width}×{capture.height}
                  </span>
                  <div className="cmp-thumb__pick">
                    <button
                      type="button"
                      className={cn('pick-btn', capture.id === aId && 'is-a')}
                      onClick={() => pick(capture.id, 'a')}
                      title="Use as side A"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className={cn('pick-btn', capture.id === bId && 'is-b')}
                      onClick={() => pick(capture.id, 'b')}
                      title="Use as side B"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="pick-btn"
                      onClick={() => downloadDataUrl(capture.dataUrl, filename(capture))}
                      title="Download PNG"
                      aria-label="Download capture"
                    >
                      <Download size={10} />
                    </button>
                    <button
                      type="button"
                      className="pick-btn"
                      onClick={() => removeCapture(capture.id)}
                      title="Remove capture"
                      aria-label="Remove capture"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cmp__main">
          <div className="cmp__toolbar">
            <Segmented<CompareMode>
              ariaLabel="Comparison mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'side', label: 'Side by side' },
                { value: 'overlay', label: 'Overlay' },
                { value: 'diff', label: 'Difference', icon: Layers },
              ]}
            />

            {mode === 'overlay' ? (
              <div className="row" style={{ gap: 8, minWidth: 190 }}>
                <span className="tool-label" style={{ margin: 0 }}>
                  Opacity
                </span>
                <input
                  type="range"
                  className="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  aria-label="Overlay opacity"
                  style={{ flex: 1 }}
                />
                <span className="mono" style={{ fontSize: 11, width: 34 }}>
                  {opacity}%
                </span>
              </div>
            ) : null}

            {mode === 'diff' ? (
              <span className="badge badge--accent">
                {working ? 'Computing…' : diffPercent === null ? 'Difference' : `${diffPercent.toFixed(1)}% of pixels differ`}
              </span>
            ) : null}

            <div className="spacer" />

            {mode === 'diff' && diffImage ? (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => downloadDataUrl(diffImage, `${capturePrefix || 'viewport'}-diff.png`)}
              >
                <Download size={12} /> Diff PNG
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={onCaptureAll}
              disabled={capturing}
            >
              {capturing ? <Loader2 size={12} className="spin" /> : <Camera size={12} />}
              {capturing ? 'Capturing…' : 'Capture all'}
            </button>
          </div>

          <div className="cmp__stage">
            {!a || !b ? (
              <div className="cmp__empty">
                <ImageIcon size={26} strokeWidth={1.4} />
                <div className="cmp__empty-title">Two captures make a comparison</div>
                <p>
                  Press <strong>Capture all</strong> and allow your browser to share this tab.
                  VIEWPORT crops each preview from the live screen, so cross-origin sites are
                  captured exactly as rendered.
                </p>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={onCaptureAll}
                  disabled={capturing}
                >
                  <Camera size={12} /> Capture previews
                </button>
                <p className="field-hint">{captures.length} of 2 captures available.</p>
              </div>
            ) : mode === 'side' ? (
              <>
                <div className="cmp__shot">
                  <div className="cmp__shot-tag">
                    <span className="badge badge--accent">A</span> {a.device} · {a.width}×{a.height}
                  </div>
                  <img src={a.dataUrl} alt={`${a.device} capture`} />
                </div>
                <div className="cmp__shot">
                  <div className="cmp__shot-tag">
                    <span className="badge badge--warn">B</span> {b.device} · {b.width}×{b.height}
                  </div>
                  <img src={b.dataUrl} alt={`${b.device} capture`} />
                </div>
              </>
            ) : mode === 'overlay' ? (
              <div className="cmp__overlay">
                <img src={a.dataUrl} alt="Capture A" />
                <img
                  className="is-over"
                  src={b.dataUrl}
                  alt="Capture B overlay"
                  style={{ opacity: opacity / 100, mixBlendMode: 'normal' }}
                />
              </div>
            ) : (
              <div className="cmp__shot">
                <div className="cmp__shot-tag">
                  <span className="badge badge--accent">Δ</span> A vs B — highlighted pixels changed
                </div>
                {diffImage ? (
                  <img src={diffImage} alt="Difference map" />
                ) : (
                  <div className="empty-note">
                    <Loader2 size={16} className="spin" />
                    Building difference map…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
