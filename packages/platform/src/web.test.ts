import { describe, expect, it, vi } from 'vitest'
import type { FileSystemAccessWindow } from './web'
import { createFallbackFs, createFileSystemAccessFs } from './web'
import { DocumentFileError, type DocumentRef } from './types'

function fakeHandle(name: string, initial: string) {
  let stored = initial
  const writable = {
    write: vi.fn((data: string) => {
      writable.pending = data
      return Promise.resolve()
    }),
    close: vi.fn(() => {
      stored = writable.pending
      return Promise.resolve()
    }),
    abort: vi.fn(() => Promise.resolve()),
    pending: '',
  }
  const handle = {
    name,
    getFile: () => Promise.resolve(new File([stored], name)),
    createWritable: vi.fn(() => Promise.resolve(writable)),
  }
  return { handle: handle as unknown as FileSystemFileHandle, writable, read: () => stored }
}

const abort = () => Promise.reject(new DOMException('cancelled', 'AbortError'))

describe('File System Access implementation', () => {
  it('opens a file and saves it back in place', async () => {
    const file = fakeHandle('notes.md', '# Notes')
    const win: FileSystemAccessWindow = {
      showOpenFilePicker: () => Promise.resolve([file.handle]),
      showSaveFilePicker: abort,
    }
    const fs = createFileSystemAccessFs(win)

    const opened = await fs.openDocument()
    expect(opened).toMatchObject({ name: 'notes.md', contents: '# Notes' })
    if (!opened) throw new Error('unreachable')
    await fs.saveDocument(opened.ref, '# Changed')
    expect(file.read()).toBe('# Changed')
  })

  it('returns null when the user cancels', async () => {
    const fs = createFileSystemAccessFs({ showOpenFilePicker: abort, showSaveFilePicker: abort })
    expect(await fs.openDocument()).toBeNull()
    expect(await fs.saveDocumentAs('x', 'a.md')).toBeNull()
  })

  it('aborts the write and keeps the original if writing fails', async () => {
    const file = fakeHandle('a.md', 'original')
    file.writable.write.mockRejectedValueOnce(new Error('disk full'))
    const fs = createFileSystemAccessFs({
      showOpenFilePicker: () => Promise.resolve([file.handle]),
      showSaveFilePicker: abort,
    })
    const opened = await fs.openDocument()
    if (!opened) throw new Error('unreachable')
    await expect(fs.saveDocument(opened.ref, 'new')).rejects.toThrow('disk full')
    expect(file.writable.abort).toHaveBeenCalled()
    expect(file.read()).toBe('original')
  })

  it('rejects references it did not create', async () => {
    const fs = createFileSystemAccessFs({ showOpenFilePicker: abort, showSaveFilePicker: abort })
    await expect(fs.saveDocument({} as DocumentRef, 'x')).rejects.toThrow(DocumentFileError)
  })
})

describe('fallback implementation', () => {
  it('saves by downloading a copy with the document name', async () => {
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()

    const fs = createFallbackFs(document)
    expect(fs.canSaveInPlace).toBe(false)
    const saved = await fs.saveDocumentAs('# Hi', 'hi.md')
    expect(saved?.name).toBe('hi.md')
    expect(clicked[0]?.download).toBe('hi.md')
  })
})
