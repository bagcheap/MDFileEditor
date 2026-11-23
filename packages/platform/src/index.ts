import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { createDesktopFs } from './desktop'
import { desktopOpenExternalUrl, webOpenExternalUrl } from './shell'
import type { FileSystemAccessWindow } from './web'
import { createFallbackFs, createFileSystemAccessFs } from './web'
import type { DocumentFileSystem, Platform } from './types'

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

/**
 * The platform the app is running on. Printing uses window.print() everywhere:
 * on macOS, Tauri routes it to the native print dialog.
 */
export function createPlatform(win: Window = window): Platform {
  const desktop = isTauri()
  const isApple = /Mac|iPhone|iPad/.test(win.navigator.userAgent)
  return {
    files: createDocumentFileSystem(win),
    openExternalUrl: desktop ? desktopOpenExternalUrl(invoke) : webOpenExternalUrl(win),
    print: () => {
      win.print()
    },
    setWindowTitle: (title) => {
      win.document.title = title
      // The page title doesn't reach the native window on its own.
      if (desktop)
        getCurrentWindow()
          .setTitle(title)
          .catch(() => undefined)
    },
    macTitleBarOverlay: desktop && isApple,
    isApple,
  }
}
