import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Platform } from '@mdedit/platform'
import { Preview } from './Preview'
import { useDocument } from './useDocument'

type View = 'preview' | 'source'

const confirmDiscard = () => window.confirm('Discard unsaved changes?')

function baseName(fileName: string): string {
  return fileName.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '')
}

export function App({ platform }: { platform: Platform }) {
  const { files } = platform
  const [view, setView] = useState<View>('preview')
  const showPreview = useCallback(() => {
    setView('preview')
  }, [])
  const { doc, dirty, busy, error, setError, open, save, saveAs, setText } = useDocument(
    files,
    confirmDiscard,
    showPreview,
  )

  // Printing always prints the formatted view, whichever tab is showing.
  const exportPdf = useCallback(() => {
    flushSync(() => {
      setView('preview')
    })
    platform.print()
  }, [platform])

  // The page title becomes the suggested PDF file name.
  useEffect(() => {
    document.title = baseName(doc.name) || 'MD File Editor'
  }, [doc.name])

  // Printing from the browser's own menu: switch to the formatted view first.
  useEffect(() => {
    const onBeforePrint = () => {
      flushSync(() => {
        setView('preview')
      })
    }
    window.addEventListener('beforeprint', onBeforePrint)
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint)
    }
  }, [])

  // Keyboard shortcuts: ⌘O open, ⌘S save, ⇧⌘S save as, ⌘P export PDF (Ctrl elsewhere).
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
      } else if (key === 'p') {
        event.preventDefault()
        exportPdf()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open, save, saveAs, exportPdf])

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

  const reportError = useCallback(
    (message: string) => {
      setError(message)
    },
    [setError],
  )

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-group">
          <button type="button" onClick={() => void open()} disabled={busy}>
            Open…
          </button>
          <button type="button" onClick={() => void save()} disabled={busy}>
            {files.canSaveInPlace ? 'Save' : 'Download'}
          </button>
          <button type="button" onClick={() => void saveAs()} disabled={busy}>
            Save As…
          </button>
          <span className="doc-name" title={doc.name}>
            {doc.name}
            {dirty && <span aria-label="unsaved changes"> •</span>}
          </span>
        </div>

        <div className="tabs" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            id="tab-preview"
            aria-selected={view === 'preview'}
            aria-controls="view-panel"
            onClick={() => {
              setView('preview')
            }}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            id="tab-source"
            aria-selected={view === 'source'}
            aria-controls="view-panel"
            onClick={() => {
              setView('source')
            }}
          >
            Source
          </button>
        </div>

        <div className="toolbar-group toolbar-end">
          <button type="button" onClick={exportPdf} title="Print or save as PDF (⌘P)">
            Export PDF…
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}

      <main id="view-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view === 'preview' ? (
          <Preview
            key={doc.id}
            text={doc.text}
            openExternalUrl={platform.openExternalUrl}
            onError={reportError}
          />
        ) : (
          <textarea
            aria-label="Document source"
            className="source"
            spellCheck={false}
            value={doc.text}
            onChange={(e) => {
              setText(e.target.value)
            }}
          />
        )}
      </main>
    </div>
  )
}
