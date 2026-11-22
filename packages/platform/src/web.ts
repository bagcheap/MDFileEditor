import { MARKDOWN_EXTENSIONS, decodeDocument } from './encoding'
import type { DocumentFileSystem, DocumentRef, OpenedDocument, SavedDocument } from './types'
import { DocumentFileError } from './types'

// Minimal typings for the File System Access API (Chromium only; not in lib.dom).
interface FilePickerOptions {
  types?: { description: string; accept: Record<string, string[]> }[]
  excludeAcceptAllOption?: boolean
  suggestedName?: string
}
export interface FileSystemAccessWindow {
  showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle>
}

const PICKER_TYPES = [
  {
    description: 'Markdown',
    accept: { 'text/markdown': MARKDOWN_EXTENSIONS.map((ext) => `.${ext}`) },
  },
]

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Chrome / Edge: real open and save-in-place via the File System Access API. */
export function createFileSystemAccessFs(win: FileSystemAccessWindow): DocumentFileSystem {
  const handles = new WeakMap<DocumentRef, FileSystemFileHandle>()

  function track(handle: FileSystemFileHandle): DocumentRef {
    const ref = Object.freeze({}) as DocumentRef
    handles.set(ref, handle)
    return ref
  }

  async function write(handle: FileSystemFileHandle, contents: string): Promise<void> {
    // createWritable writes to a temporary file that replaces the original on close(),
    // so an interrupted save leaves the original untouched.
    const writable = await handle.createWritable()
    try {
      await writable.write(contents)
      await writable.close()
    } catch (error) {
      await writable.abort().catch(() => undefined)
      throw error
    }
  }

  return {
    kind: 'web',
    canSaveInPlace: true,

    async openDocument(): Promise<OpenedDocument | null> {
      let handle: FileSystemFileHandle | undefined
      try {
        ;[handle] = await win.showOpenFilePicker({ types: PICKER_TYPES })
      } catch (error) {
        if (isAbort(error)) return null
        throw error
      }
      if (!handle) return null
      const file = await handle.getFile()
      const contents = decodeDocument(await file.arrayBuffer())
      return { name: file.name, contents, ref: track(handle) }
    },

    async saveDocument(ref, contents): Promise<void> {
      const handle = handles.get(ref)
      if (!handle) throw new DocumentFileError('Unknown document reference.')
      await write(handle, contents)
    },

    async saveDocumentAs(contents, suggestedName): Promise<SavedDocument | null> {
      let handle: FileSystemFileHandle
      try {
        handle = await win.showSaveFilePicker({ types: PICKER_TYPES, suggestedName })
      } catch (error) {
        if (isAbort(error)) return null
        throw error
      }
      await write(handle, contents)
      return { name: handle.name, ref: track(handle) }
    },
  }
}

/**
 * Safari / Firefox: open through an <input type="file">, "save" by downloading a copy.
 */
export function createFallbackFs(doc: Document): DocumentFileSystem {
  const names = new WeakMap<DocumentRef, string>()

  function track(name: string): DocumentRef {
    const ref = Object.freeze({}) as DocumentRef
    names.set(ref, name)
    return ref
  }

  function download(contents: string, name: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/markdown;charset=utf-8' }))
    const link = doc.createElement('a')
    link.href = url
    link.download = name
    link.rel = 'noopener'
    link.click()
    // Revoke after the click has been handled.
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  }

  function pickFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = doc.createElement('input')
      input.type = 'file'
      input.accept = MARKDOWN_EXTENSIONS.map((ext) => `.${ext}`).join(',')
      input.addEventListener('change', () => {
        resolve(input.files?.[0] ?? null)
      })
      input.addEventListener('cancel', () => {
        resolve(null)
      })
      input.click()
    })
  }

  return {
    kind: 'web-fallback',
    canSaveInPlace: false,

    async openDocument(): Promise<OpenedDocument | null> {
      const file = await pickFile()
      if (!file) return null
      const contents = decodeDocument(await file.arrayBuffer())
      return { name: file.name, contents, ref: track(file.name) }
    },

    saveDocument(ref, contents): Promise<void> {
      const name = names.get(ref)
      if (name === undefined)
        return Promise.reject(new DocumentFileError('Unknown document reference.'))
      download(contents, name)
      return Promise.resolve()
    },

    saveDocumentAs(contents, suggestedName): Promise<SavedDocument | null> {
      download(contents, suggestedName)
      return Promise.resolve({ name: suggestedName, ref: track(suggestedName) })
    },
  }
}
