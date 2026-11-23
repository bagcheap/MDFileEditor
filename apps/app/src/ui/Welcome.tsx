import { AppMark, FolderIcon, PlusIcon } from './icons'
import { shortcutLabel } from './shortcuts'

interface WelcomeProps {
  isApple: boolean
  onOpen: () => void
  onNew: () => void
}

/** First screen: what the app is and the two ways to begin. */
export function Welcome({ isApple, onOpen, onNew }: WelcomeProps) {
  const key = (k: string, shift = false) => shortcutLabel(isApple, k, shift)
  const shortcuts: [string, string][] = [
    ['Open a file', key('O')],
    ['Save', key('S')],
    ['Save as', key('S', true)],
    ['Export PDF', key('P')],
  ]

  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-mark">
        <AppMark />
      </div>
      <h1 id="welcome-title">MD File Editor</h1>
      <p className="welcome-lede">Read, write and export Markdown, beautifully.</p>
      <div className="welcome-actions">
        <button type="button" className="button button-primary" onClick={onOpen}>
          <FolderIcon />
          Open File…
        </button>
        <button type="button" className="button" onClick={onNew}>
          <PlusIcon />
          New Document
        </button>
      </div>
      <dl className="welcome-shortcuts">
        {shortcuts.map(([label, combo]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <kbd>{combo}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
