import { useCallback, useState } from 'react'
import type { DocumentFileSystem, DocumentRef } from '@mdedit/platform'

export interface DocumentState {
  name: string
  /** Null for a new document that has never been saved. */
  ref: DocumentRef | null
  /** Text as last loaded from / written to disk. */
  savedText: string
  text: string
}

const UNTITLED: DocumentState = { name: 'Untitled.md', ref: null, savedText: '', text: '' }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Open/edit/save state for the single open document. */
export function useDocument(fs: DocumentFileSystem, confirmDiscard: () => boolean) {
  const [doc, setDoc] = useState<DocumentState>(UNTITLED)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const dirty = doc.text !== doc.savedText

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const open = useCallback(
    () =>
      run(async () => {
        if (dirty && !confirmDiscard()) return
        const opened = await fs.openDocument()
        if (!opened) return
        setDoc({
          name: opened.name,
          ref: opened.ref,
          savedText: opened.contents,
          text: opened.contents,
        })
      }),
    [run, fs, dirty, confirmDiscard],
  )

  const saveAs = useCallback(
    () =>
      run(async () => {
        const text = doc.text
        const saved = await fs.saveDocumentAs(text, doc.name)
        if (!saved) return
        setDoc((d) => ({ ...d, name: saved.name, ref: saved.ref, savedText: text }))
      }),
    [run, fs, doc.text, doc.name],
  )

  const save = useCallback(() => {
    const { ref, text } = doc
    if (!ref) return saveAs()
    return run(async () => {
      await fs.saveDocument(ref, text)
      setDoc((d) => ({ ...d, savedText: text }))
    })
  }, [run, fs, doc, saveAs])

  const setText = useCallback((text: string) => {
    setDoc((d) => ({ ...d, text }))
  }, [])

  return { doc, dirty, busy, error, open, save, saveAs, setText }
}
