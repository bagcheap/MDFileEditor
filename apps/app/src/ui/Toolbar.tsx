import { DocumentIcon, ExportIcon, FolderIcon, SaveIcon } from './icons'
import { MoreMenu } from './MoreMenu'
import { shortcutLabel } from './shortcuts'

export type View = 'preview' | 'source'

interface ToolbarProps {
  title: string
  dirty: boolean
  busy: boolean
  view: View
  canSaveInPlace: boolean
  isApple: boolean
  onViewChange: (view: View) => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExportPdf: () => void
}

export function Toolbar(props: ToolbarProps) {
  const { title, dirty, busy, view, canSaveInPlace, isApple } = props
  const key = (k: string, shift = false) => shortcutLabel(isApple, k, shift)
  const saveLabel = canSaveInPlace ? 'Save' : 'Download'

  return (
    // "deep": the whole bar drags the window (desktop), except its buttons.
    <header className="toolbar" data-tauri-drag-region="deep">
      <div className="toolbar-title">
        <span className="toolbar-doc-icon">
          <DocumentIcon />
        </span>
        <span className="toolbar-doc-name" title={title}>
          {title}
        </span>
        {dirty && (
          <span className="toolbar-edited" aria-label="unsaved changes">
            Edited
          </span>
        )}
      </div>

      <div className="segmented" role="tablist" aria-label="View">
        {(['preview', 'source'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            id={`tab-${v}`}
            aria-selected={view === v}
            aria-controls="view-panel"
            onClick={() => {
              props.onViewChange(v)
            }}
          >
            {v === 'preview' ? 'Preview' : 'Source'}
          </button>
        ))}
      </div>

      <div className="toolbar-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Open…"
          title={`Open… (${key('O')})`}
          onClick={props.onOpen}
          disabled={busy}
        >
          <FolderIcon />
        </button>
        <button
          type="button"
          className={`icon-button${dirty ? ' icon-button-attention' : ''}`}
          aria-label={saveLabel}
          title={`${saveLabel} (${key('S')})`}
          onClick={props.onSave}
          disabled={busy}
        >
          <SaveIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Export PDF…"
          title={`Export PDF… (${key('P')})`}
          onClick={props.onExportPdf}
        >
          <ExportIcon />
        </button>
        <MoreMenu
          items={[
            { label: 'Save As…', shortcut: key('S', true), onSelect: props.onSaveAs },
            { label: 'Export PDF…', shortcut: key('P'), onSelect: props.onExportPdf },
          ]}
        />
      </div>
    </header>
  )
}
