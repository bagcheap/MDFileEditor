import { isTauri } from '@tauri-apps/api/core'
import { createDesktopFs } from './desktop'
import type { FileSystemAccessWindow } from './web'
import { createFallbackFs, createFileSystemAccessFs } from './web'
import type { DocumentFileSystem } from './types'

export * from './types'
export { MAX_DOCUMENT_BYTES, MARKDOWN_EXTENSIONS, decodeDocument } from './encoding'
export { createDesktopFs } from './desktop'
export { createFallbackFs, createFileSystemAccessFs } from './web'

function hasFileSystemAccess(win: Window): win is Window & FileSystemAccessWindow {
  return 'showOpenFilePicker' in win && 'showSaveFilePicker' in win
}

/** Picks the right file system for where the app is running. */
export function createDocumentFileSystem(win: Window = window): DocumentFileSystem {
  if (isTauri()) return createDesktopFs()
  if (hasFileSystemAccess(win)) return createFileSystemAccessFs(win)
  return createFallbackFs(win.document)
}
