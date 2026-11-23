import { useDeferredValue, useMemo } from 'react'
import { documentStats } from '@mdedit/core'

const number = new Intl.NumberFormat()

export function StatusBar({ text }: { text: string }) {
  // Counting can wait until typing pauses.
  const deferred = useDeferredValue(text)
  const stats = useMemo(() => documentStats(deferred), [deferred])

  return (
    <footer className="status-bar" aria-label="Document statistics">
      <span>
        {number.format(stats.words)} {stats.words === 1 ? 'word' : 'words'}
      </span>
      <span aria-hidden="true">·</span>
      <span>{number.format(stats.characters)} characters</span>
      {stats.readingMinutes > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>{stats.readingMinutes} min read</span>
        </>
      )}
      <span className="status-bar-end">Markdown</span>
    </footer>
  )
}
