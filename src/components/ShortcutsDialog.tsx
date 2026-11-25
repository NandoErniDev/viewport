import { Keyboard } from 'lucide-react'
import { useWorkspace } from '../lib/store'
import { MOD, Modal } from './ui'

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: [MOD, 'K'], label: 'Focus the URL input' },
  { keys: [MOD, 'R'], label: 'Reload every preview' },
  { keys: [MOD, 'S'], label: 'Save the current workspace' },
  { keys: ['1'], label: 'Single preview (focus mode)' },
  { keys: ['2'], label: 'Two-column layout' },
  { keys: ['3'], label: 'Three-column layout' },
  { keys: ['4'], label: 'Grid layout' },
  { keys: ['F'], label: 'Fullscreen the selected preview' },
  { keys: ['B'], label: 'Toggle breakpoint explorer' },
  { keys: ['G'], label: 'Toggle device library' },
  { keys: ['Esc'], label: 'Close panels, dialogs and fullscreen' },
  { keys: ['?'], label: 'Show this reference' },
]

export function ShortcutsDialog() {
  const panel = useWorkspace((state) => state.panel)
  const setPanel = useWorkspace((state) => state.setPanel)

  return (
    <Modal
      open={panel === 'shortcuts'}
      onClose={() => setPanel(null)}
      title="Keyboard shortcuts"
      subtitle="Built for people who test layouts all day."
      icon={Keyboard}
      size="narrow"
    >
      <table className="keys-table">
        <thead>
          <tr>
            <th>Action</th>
            <th style={{ textAlign: 'right' }}>Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.label}>
              <td>{shortcut.label}</td>
              <td>
                <span className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                  {shortcut.keys.map((key) => (
                    <span className="kbd" key={key}>
                      {key}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="field-hint" style={{ marginTop: 14 }}>
        Shortcuts are ignored while typing in an input. Function-key shortcuts may be captured by
        your operating system or browser first.
      </p>
    </Modal>
  )
}
