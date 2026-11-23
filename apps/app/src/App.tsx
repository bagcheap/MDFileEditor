import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Platform } from '@mdedit/platform'
import { Preview } from './Preview'
import { StatusBar } from './ui/StatusBar'
import { Toast } from './ui/Toast'
import { Toolbar, type View } from './ui/Toolbar'
import { Welcome } from './ui/Welcome'
import { useDocument } from './useDocument'

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

  // Nothing opened or typed yet: show the welcome screen instead of an empty page.
  const isFresh = doc.id === 0 && doc.ref === null && doc.text === ''

  // Printing always prints the formatted view, whichever tab is showing.
  const exportPdf = useCallback(() => {
    flushSync(() => {
      setView('preview')
    })
    platform.print()
  }, [platform])

  // The title becomes the window title and the suggested PDF file name.
  const { setWindowTitle } = platform
  useEffect(() => {
    setWindowTitle(isFresh ? 'MD File Editor' : baseName(doc.name) || 'MD File Editor')
  }, [setWindowTitle, doc.name, isFresh])

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

  const appClass = platform.macTitleBarOverlay ? 'app app-mac-overlay' : 'app'

  return (
    <div className={appClass}>
      <Toolbar
        title={isFresh ? 'MD File Editor' : doc.name}
        dirty={dirty}
        busy={busy}
        view={view}
        canSaveInPlace={files.canSaveInPlace}
        isApple={platform.isApple}
        onViewChange={setView}
        onOpen={() => void open()}
        onSave={() => void save()}
        onSaveAs={() => void saveAs()}
        onExportPdf={exportPdf}
      />

      <main id="view-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view === 'source' ? (
          <textarea
            aria-label="Document source"
            className="source"
            spellCheck={false}
            // Focus the editor whenever the Source tab is shown.
            autoFocus
            placeholder="Start writing Markdown…"
            value={doc.text}
            onChange={(e) => {
              setText(e.target.value)
            }}
          />
        ) : isFresh ? (
          <div className="scroll-area">
            <Welcome
              isApple={platform.isApple}
              onOpen={() => void open()}
              onNew={() => {
                setView('source')
              }}
            />
          </div>
        ) : (
          <Preview
            key={doc.id}
            text={doc.text}
            openExternalUrl={platform.openExternalUrl}
            onError={reportError}
          />
        )}
      </main>

      {!isFresh && <StatusBar text={doc.text} />}

      {error && (
        <Toast
          message={error}
          onDismiss={() => {
            setError(null)
          }}
        />
      )}
    </div>
  )
}
