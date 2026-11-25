import { useMemo, useState } from 'react'
import { Laptop, Monitor, Plus, Search, Smartphone, Tablet, Trash2, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEVICE_PRESETS,
  dimensionsLabel,
} from '../lib/devices'
import { MAX_PREVIEWS, useWorkspace } from '../lib/store'
import type { DeviceCategory, DevicePreset } from '../lib/types'
import { cn } from '../lib/utils'
import { IconButton } from './ui'

const CATEGORY_ICONS: Record<DeviceCategory, typeof Smartphone> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  custom: Plus,
}

function Glyph({ preset }: { preset: DevicePreset }) {
  const max = 15
  const ratio = preset.width / preset.height
  const width = ratio >= 1 ? max : Math.max(5, Math.round(max * ratio))
  const height = ratio >= 1 ? Math.max(5, Math.round(max / ratio)) : max
  return (
    <span className="preset__glyph" aria-hidden="true">
      <span
        style={{
          width,
          height,
          border: '1px solid currentColor',
          borderRadius: 2,
          display: 'block',
          opacity: 0.85,
        }}
      />
    </span>
  )
}

export function DeviceLibrary() {
  const previews = useWorkspace((state) => state.previews)
  const customDevices = useWorkspace((state) => state.customDevices)
  const addPreset = useWorkspace((state) => state.addPreset)
  const removePreview = useWorkspace((state) => state.removePreview)
  const removeCustomDevice = useWorkspace((state) => state.removeCustomDevice)
  const setPanel = useWorkspace((state) => state.setPanel)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const all = [...DEVICE_PRESETS, ...customDevices]
    if (!term) return all
    return all.filter(
      (preset) =>
        preset.name.toLowerCase().includes(term) ||
        String(preset.width).includes(term) ||
        String(preset.height).includes(term),
    )
  }, [query, customDevices])

  const atCapacity = previews.length >= MAX_PREVIEWS

  return (
    <>
      <div className="drawer-scrim" onPointerDown={() => setPanel(null)} />
      <aside className="drawer" aria-label="Device library">
        <div className="drawer__head">
          <div>
            <div className="drawer__title">Device library</div>
            <div className="field-hint">CSS viewport sizes, not physical pixels</div>
          </div>
          <IconButton icon={X} label="Close device library" onClick={() => setPanel(null)} />
        </div>

        <div className="lib-search">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={13}
              strokeWidth={1.8}
              style={{ position: 'absolute', left: 9, top: 10, color: 'var(--text-3)' }}
            />
            <input
              className="input"
              style={{ paddingLeft: 28 }}
              placeholder="Search devices"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search devices"
            />
          </div>
        </div>

        <div className="drawer__body">
          <div className="cat-head">
            <span>In this workspace</span>
            <span className="mono">{previews.length}/{MAX_PREVIEWS}</span>
          </div>
          {previews.map((preview) => (
            <div className="active-row" key={preview.instanceId}>
              <span className="preset__glyph" style={{ width: 22, height: 22 }}>
                {(() => {
                  const Icon = CATEGORY_ICONS[preview.category] ?? Monitor
                  return <Icon size={11} strokeWidth={1.7} />
                })()}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {preview.name}
              </span>
              <span className="active-row__dims">
                {dimensionsLabel(preview.width, preview.height)}
              </span>
              <IconButton
                icon={X}
                label={`Remove ${preview.name}`}
                size="sm"
                onClick={() => removePreview(preview.instanceId)}
              />
            </div>
          ))}

          {CATEGORY_ORDER.map((category) => {
            const items = filtered.filter((preset) => preset.category === category)
            if (items.length === 0) return null
            const Icon = CATEGORY_ICONS[category]
            return (
              <div key={category}>
                <div className="cat-head">
                  <span>
                    <Icon size={10} strokeWidth={2} style={{ marginRight: 5, verticalAlign: -1 }} />
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="mono">{items.length}</span>
                </div>
                {items.map((preset) => (
                  <div className="preset" key={preset.id}>
                    <Glyph preset={preset} />
                    <div className="preset__body">
                      <span className="preset__name">{preset.name}</span>
                      <span className="preset__meta">
                        {dimensionsLabel(preset.width, preset.height)}
                        <span>@{preset.dpr}x</span>
                        {preset.note ? <span>· {preset.note}</span> : null}
                      </span>
                    </div>
                    {preset.category === 'custom' ? (
                      <IconButton
                        icon={Trash2}
                        label={`Delete ${preset.name}`}
                        size="sm"
                        onClick={() => removeCustomDevice(preset.id)}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="preset__add"
                      aria-label={`Add ${preset.name}`}
                      title={atCapacity ? 'Remove a preview first' : `Add ${preset.name}`}
                      onClick={() => addPreset(preset.id)}
                      disabled={atCapacity}
                    >
                      <Plus size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}

          {filtered.length === 0 ? (
            <div className="empty-note">
              <Search size={18} strokeWidth={1.5} />
              No devices match “{query}”.
            </div>
          ) : null}
        </div>

        <div className="drawer__foot">
          <button
            type="button"
            className={cn('btn btn--outline btn--block')}
            onClick={() => setPanel('device-editor')}
          >
            <Plus size={13} strokeWidth={1.9} /> Create custom device
          </button>
        </div>
      </aside>
    </>
  )
}
