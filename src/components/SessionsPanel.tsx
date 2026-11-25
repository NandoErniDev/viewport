import { useState } from 'react'
import { ArrowRight, FolderOpen, History, Save, Trash2 } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import { displayUrl, relativeTime } from '../lib/utils'
import { Modal } from './ui'

export function SessionsPanel() {
  const panel = useWorkspace((state) => state.panel)
  const sessions = useWorkspace((state) => state.sessions)
  const recent = useWorkspace((state) => state.recent)
  const saveSession = useWorkspace((state) => state.saveSession)
  const loadSession = useWorkspace((state) => state.loadSession)
  const deleteSession = useWorkspace((state) => state.deleteSession)
  const clearRecent = useWorkspace((state) => state.clearRecent)
  const navigate = useWorkspace((state) => state.navigate)
  const setPanel = useWorkspace((state) => state.setPanel)
  const [name, setName] = useState('')

  return (
    <Modal
      open={panel === 'sessions'}
      onClose={() => setPanel(null)}
      title="Workspaces & history"
      subtitle="Saved in this browser's local storage. Nothing leaves your machine."
      icon={FolderOpen}
      size="narrow"
    >
      <div className="section">
        <div className="section__title">
          <Save size={13} strokeWidth={1.7} /> Save current workspace
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Name, e.g. Marketing site — Q4 audit"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                saveSession(name)
                setName('')
              }
            }}
            aria-label="Workspace name"
          />
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              saveSession(name)
              setName('')
            }}
          >
            Save
          </button>
        </div>
        <p className="field-hint" style={{ marginTop: 6 }}>
          Saves the URL, devices and sizes, layout, zoom and sync settings.
        </p>
      </div>

      <div className="section">
        <div className="section__title">
          <FolderOpen size={13} strokeWidth={1.7} /> Saved workspaces
          <span className="spacer" />
          <span className="mono" style={{ fontSize: 10, letterSpacing: 0 }}>
            {sessions.length}
          </span>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-note" style={{ padding: '20px 10px' }}>
            <FolderOpen size={18} strokeWidth={1.5} />
            Nothing saved yet. Set up a workspace and save it for later.
          </div>
        ) : (
          sessions.map((session) => (
            <div className="session-row" key={session.id}>
              <div className="session-row__body">
                <div className="session-row__name">{session.name}</div>
                <div className="session-row__meta">
                  {session.config.previews.length} devices · {session.config.layout} ·{' '}
                  {displayUrl(session.config.url)} · {relativeTime(session.createdAt)}
                </div>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => loadSession(session.id)}
                >
                  Load <ArrowRight size={11} />
                </button>
                <button
                  type="button"
                  className="btn btn--danger-ghost btn--sm"
                  onClick={() => deleteSession(session.id)}
                  aria-label={`Delete ${session.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section__title">
          <History size={13} strokeWidth={1.7} /> Recently tested
          <span className="spacer" />
          {recent.length > 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearRecent}>
              Clear
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <p className="field-hint">URLs you test will appear here.</p>
        ) : (
          recent.map((entry) => (
            <div className="recent-row" key={entry.url}>
              <div className="recent-row__body">
                <div className="recent-row__url">{displayUrl(entry.url)}</div>
                <div className="recent-row__meta">
                  {relativeTime(entry.at)} · {entry.url.split('://')[0]}
                </div>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    navigate(entry.url)
                    setPanel(null)
                  }}
                >
                  Load
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
