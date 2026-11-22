import { invoke } from '@tauri-apps/api/core'
import type { DocumentFileSystem, DocumentRef, OpenedDocument, SavedDocument } from './types'
import { DocumentFileError } from './types'

/** Shapes returned by the Rust commands in apps/app/src-tauri/src/documents.rs. */
interface NativeOpened {
  path: string
  name: string
  contents: string
}
interface NativeSaved {
  path: string
  name: string
}

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

function toError(error: unknown): Error {
  return error instanceof Error ? error : new DocumentFileError(String(error))
}

/**
 * macOS desktop (Tauri). All file access happens in Rust, which only touches files
 * the user picked in a native dialog during this session.
 */
export function createDesktopFs(call: Invoke = invoke): DocumentFileSystem {
  const paths = new WeakMap<DocumentRef, string>()

  function track(path: string): DocumentRef {
    const ref = Object.freeze({}) as DocumentRef
    paths.set(ref, path)
    return ref
  }

  return {
    kind: 'desktop',
    canSaveInPlace: true,

    async openDocument(): Promise<OpenedDocument | null> {
      const opened = await call<NativeOpened | null>('open_document').catch((e: unknown) => {
        throw toError(e)
      })
      if (!opened) return null
      return { name: opened.name, contents: opened.contents, ref: track(opened.path) }
    },

    async saveDocument(ref, contents): Promise<void> {
      const path = paths.get(ref)
      if (path === undefined) throw new DocumentFileError('Unknown document reference.')
      await call('save_document', { path, contents }).catch((e: unknown) => {
        throw toError(e)
      })
    },

    async saveDocumentAs(contents, suggestedName): Promise<SavedDocument | null> {
      const saved = await call<NativeSaved | null>('save_document_as', {
        contents,
        suggestedName,
      }).catch((e: unknown) => {
        throw toError(e)
      })
      if (!saved) return null
      return { name: saved.name, ref: track(saved.path) }
    },
  }
}
