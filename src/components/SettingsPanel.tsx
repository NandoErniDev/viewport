import { Frame, Info, RotateCcw, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import { displayUrl } from '../lib/utils'
import { IconButton, Modal, SectionTitle, Switch } from './ui'

export function SettingsPanel() {
  const panel = useWorkspace((state) => state.panel)
  const showFrames = useWorkspace((state) => state.showFrames)
  const syncScroll = useWorkspace((state) => state.syncScroll)
  const syncNav = useWorkspace((state) => state.syncNav)
  const zoom = useWorkspace((state) => state.zoom)
  const capturePrefix = useWorkspace((state) => state.capturePrefix)
  const customDevices = useWorkspace((state) => state.customDevices)
  const captures = useWorkspace((state) => state.captures)
  const previews = useWorkspace((state) => state.previews)

  const setShowFrames = useWorkspace((state) => state.setShowFrames)
  const setSyncScroll = useWorkspace((state) => state.setSyncScroll)
  const setSyncNav = useWorkspace((state) => state.setSyncNav)
  const setZoom = useWorkspace((state) => state.setZoom)
  const setCapturePrefix = useWorkspace((state) => state.setCapturePrefix)
  const removeCustomDevice = useWorkspace((state) => state.removeCustomDevice)
  const clearCaptures = useWorkspace((state) => state.clearCaptures)
  const setPanel = useWorkspace((state) => state.setPanel)
  const resetWorkspace = useWorkspace((state) => state.resetWorkspace)

  return (
    <Modal
      open={panel === 'settings'}
      onClose={() => setPanel(null)}
      title="Settings"
      subtitle="Preferences are stored locally and included in saved workspaces."
      icon={Settings2}
      size="narrow"
    >
      <div className="section">
        <SectionTitle icon={Frame}>Workspace</SectionTitle>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">Device frames</div>
            <div className="setting-row__hint">
              Bezels for phones and tablets, thin outlines for larger screens.
            </div>
          </div>
          <Switch checked={showFrames} onChange={setShowFrames} label="Device frames">
            {showFrames ? 'On' : 'Off'}
          </Switch>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">Scroll synchronisation</div>
            <div className="setting-row__hint">
              Mirrors scroll position between same-origin previews only.
            </div>
          </div>
          <Switch checked={syncScroll} onChange={setSyncScroll} label="Scroll sync">
            {syncScroll ? 'On' : 'Off'}
          </Switch>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">Navigation synchronisation</div>
            <div className="setting-row__hint">
              A new URL loads in every preview. Turn off to give one preview its own URL.
            </div>
          </div>
          <Switch checked={syncNav} onChange={setSyncNav} label="Navigation sync">
            {syncNav ? 'On' : 'Off'}
          </Switch>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">Default zoom</div>
            <div className="setting-row__hint">Fit scales each device to the available pane.</div>
          </div>
          <select
            className="input"
            style={{ width: 120 }}
            value={String(zoom)}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Default zoom"
          >
            <option value="0">Fit</option>
            <option value="0.25">25%</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
          </select>
        </div>
      </div>

      <div className="section">
        <SectionTitle icon={Settings2}>Screenshots</SectionTitle>
        <div className="field">
          <label htmlFor="capture-prefix">Filename prefix</label>
          <input
            id="capture-prefix"
            className="input input--mono"
            value={capturePrefix}
            onChange={(event) => setCapturePrefix(event.target.value)}
            placeholder="viewport"
          />
        </div>
        <p className="field-hint" style={{ marginTop: 6 }}>
          Files are named {capturePrefix || 'viewport'}-device-widthxheight.png. Captures live in
          memory only — download what you want to keep.
        </p>
        {captures.length > 0 ? (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            style={{ marginTop: 8 }}
            onClick={clearCaptures}
          >
            <Trash2 size={12} /> Discard {captures.length} capture
            {captures.length === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      <div className="section">
        <SectionTitle icon={Frame}>Custom devices</SectionTitle>
        {customDevices.length === 0 ? (
          <p className="field-hint">
            No custom devices yet. Open the device library to create one.
          </p>
        ) : (
          customDevices.map((device) => (
            <div className="setting-row" key={device.id}>
              <div>
                <div className="setting-row__label">{device.name}</div>
                <div className="setting-row__hint mono" style={{ fontSize: 11 }}>
                  {device.width} × {device.height} · @{device.dpr}x
                </div>
              </div>
              <IconButton
                icon={Trash2}
                label={`Delete ${device.name}`}
                onClick={() => removeCustomDevice(device.id)}
              />
            </div>
          ))
        )}
      </div>

      <div className="section">
        <SectionTitle icon={ShieldCheck}>Workspace data</SectionTitle>
        <p className="field-hint" style={{ marginBottom: 10 }}>
          Current workspace: {previews.length} previews · {displayUrl(previews[0]?.url ?? '')}
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--outline" onClick={resetWorkspace}>
            <RotateCcw size={13} /> Reset workspace
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => {
              window.localStorage.removeItem('viewport.workspace.v1')
              window.location.reload()
            }}
          >
            <Trash2 size={13} /> Clear all local data
          </button>
        </div>
        <p className="field-hint" style={{ marginTop: 8 }}>
          Local data includes saved workspaces, custom devices and scroll history. Nothing is sent
          to a server.
        </p>
      </div>

      <div className="settings-note">
        <Info size={14} strokeWidth={1.8} />
        <div>
          <strong style={{ color: 'var(--text)' }}>Browser limits are real.</strong> Some sites block
          embedding with <code>X-Frame-Options</code> or CSP, and cross-origin frames keep their
          scroll position private. VIEWPORT reports these cases instead of faking a preview.
        </div>
      </div>
    </Modal>
  )
}
