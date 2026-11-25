import { useEffect, useMemo, useState } from 'react'
import { MonitorSmartphone, Plus } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import type { FrameStyle, Orientation } from '../lib/types'
import { clamp, cn } from '../lib/utils'
import { Modal, Segmented } from './ui'

const FRAME_OPTIONS: Array<{ value: FrameStyle; label: string }> = [
  { value: 'bezel', label: 'Bezel' },
  { value: 'outline', label: 'Outline' },
  { value: 'none', label: 'None' },
]

export function CustomDeviceDialog() {
  const panel = useWorkspace((state) => state.panel)
  const setPanel = useWorkspace((state) => state.setPanel)
  const addCustomDevice = useWorkspace((state) => state.addCustomDevice)
  const addCustomPreview = useWorkspace((state) => state.addCustomPreview)
  const toast = useWorkspace((state) => state.toast)

  const [name, setName] = useState('My device')
  const [width, setWidth] = useState(500)
  const [height, setHeight] = useState(900)
  const [dpr, setDpr] = useState(2)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('bezel')

  const open = panel === 'device-editor'

  useEffect(() => {
    if (!open) return
    setName('My device')
    setWidth(500)
    setHeight(900)
    setDpr(2)
    setOrientation('portrait')
    setFrameStyle('bezel')
  }, [open])

  const previewScale = useMemo(
    () => clamp(Math.min(220 / width, 168 / height), 0.02, 1),
    [width, height],
  )

  const applyOrientation = (next: Orientation) => {
    if (next === orientation) return
    setOrientation(next)
    setWidth(height)
    setHeight(width)
  }

  const save = () => {
    const cleanWidth = clamp(Math.round(width), 160, 4096)
    const cleanHeight = clamp(Math.round(height), 160, 4096)
    const preset = addCustomDevice({
      name: name.trim() || 'Custom device',
      width: cleanWidth,
      height: cleanHeight,
      dpr,
      category: 'custom',
      note: 'Custom',
    })
    addCustomPreview(preset, frameStyle)
    setPanel(null)
    toast(`“${preset.name}” added to the workspace and saved to your devices.`, 'success')
  }

  return (
    <Modal
      open={open}
      onClose={() => setPanel(null)}
      title="Custom device"
      subtitle="Exact CSS viewport size. It is saved locally and appears in your device library."
      icon={MonitorSmartphone}
      footer={
        <>
          <span className="field-hint">
            {clamp(Math.round(width), 160, 4096)} × {clamp(Math.round(height), 160, 4096)} CSS px
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setPanel(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={save}>
              <Plus size={13} /> Create device
            </button>
          </div>
        </>
      }
    >
      <div className="editor-grid">
        <div className="col" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="device-name">Device name</label>
            <input
              id="device-name"
              className="input"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Kiosk 24″"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="device-width">Width (px)</label>
              <input
                id="device-width"
                className="input input--mono"
                type="number"
                min={160}
                max={4096}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="device-height">Height (px)</label>
              <input
                id="device-height"
                className="input input--mono"
                type="number"
                min={160}
                max={4096}
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="device-dpr">Pixel ratio</label>
              <select
                id="device-dpr"
                className="input"
                value={String(dpr)}
                onChange={(event) => setDpr(Number(event.target.value))}
              >
                <option value="1">1× — standard</option>
                <option value="1.5">1.5×</option>
                <option value="2">2× — retina</option>
                <option value="2.625">2.625×</option>
                <option value="3">3× — phone</option>
                <option value="4">4×</option>
              </select>
            </div>
            <div className="field">
              <label>Orientation</label>
              <Segmented<Orientation>
                ariaLabel="Device orientation"
                value={orientation}
                onChange={applyOrientation}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
            </div>
          </div>

          <div className="field">
            <label>Frame style</label>
            <Segmented<FrameStyle>
              ariaLabel="Frame style"
              value={frameStyle}
              onChange={setFrameStyle}
              options={FRAME_OPTIONS}
            />
          </div>

          <div className="field">
            <label>Quick sizes</label>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[
                [320, 568],
                [414, 896],
                [834, 1112],
                [1024, 768],
                [1440, 900],
              ].map(([w, h]) => (
                <button
                  key={`${w}x${h}`}
                  type="button"
                  className={cn('chip', width === w && height === h && 'is-active')}
                  onClick={() => {
                    setWidth(w)
                    setHeight(h)
                    setOrientation(w <= h ? 'portrait' : 'landscape')
                  }}
                >
                  {w}×{h}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="editor-preview" style={{ minHeight: 220 }}>
            <div
              className="editor-preview__shell"
              style={{
                width: clamp(width, 160, 4096) * previewScale,
                height: clamp(height, 160, 4096) * previewScale,
                borderRadius: frameStyle === 'bezel' ? 10 : frameStyle === 'outline' ? 3 : 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(160deg, rgba(139,147,255,.22), rgba(139,147,255,.04) 60%, transparent)',
                }}
              />
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: 10 }}>
            Preview is schematic. The real frame renders at {clamp(width, 160, 4096)} CSS pixels wide,
            independent of your display.
          </p>
        </div>
      </div>
    </Modal>
  )
}
