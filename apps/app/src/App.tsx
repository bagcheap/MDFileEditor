import { useEffect } from 'react'
import type { DocumentFileSystem } from '@mdedit/platform'
import { useDocument } from './useDocument'

const confirmDiscard = () => window.confirm('Discard unsaved changes?')

export function App({ fs }: { fs: DocumentFileSystem }) {
  const { doc, dirty, busy, error, open, save, saveAs, setText } = useDocument(fs, confirmDiscard)

  // Keyboard shortcuts: ⌘O / ⌘S / ⇧⌘S (Ctrl on non-Mac).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === 'o') {
        event.preventDefault()
        void open()
      } else if (key === 's') {
        event.preventDefault()
        void (event.shiftKey ? saveAs() : save())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open, save, saveAs])

  // Warn before closing the tab/window with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty])

  return (
    <div className="app">
      <header className="toolbar">
        <button type="button" onClick={() => void open()} disabled={busy}>
          Open…
        </button>
        <button type="button" onClick={() => void save()} disabled={busy}>
          {fs.canSaveInPlace ? 'Save' : 'Download'}
        </button>
        <button type="button" onClick={() => void saveAs()} disabled={busy}>
          Save As…
        </button>
        <span className="doc-name" title={doc.name}>
          {doc.name}
          {dirty && <span aria-label="unsaved changes"> •</span>}
        </span>
      </header>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <main>
        <textarea
          aria-label="Document source"
          className="source"
          spellCheck={false}
          value={doc.text}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
      </main>
    </div>
  )
}
