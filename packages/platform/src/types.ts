/**
 * Opaque reference to an opened file. Only the file system implementation that
 * created it can interpret it, so UI code cannot forge references to other files.
 */
export interface DocumentRef {
  readonly __documentRef: unique symbol
}

export interface OpenedDocument {
  /** File name for display, e.g. "notes.md". */
  readonly name: string
  /** Exact file contents (strict UTF-8; never lossy-decoded). */
  readonly contents: string
  readonly ref: DocumentRef
}

export interface SavedDocument {
  readonly name: string
  readonly ref: DocumentRef
}

export type FileSystemKind = 'desktop' | 'web' | 'web-fallback'

export interface DocumentFileSystem {
  readonly kind: FileSystemKind
  /** False when "save" can only download a copy (browsers without the File System Access API). */
  readonly canSaveInPlace: boolean
  /** Shows a file picker. Resolves to null if the user cancels. */
  openDocument(): Promise<OpenedDocument | null>
  /** Writes `contents` back to the file behind `ref`. */
  saveDocument(ref: DocumentRef, contents: string): Promise<void>
  /** Shows a save dialog. Resolves to null if the user cancels. */
  saveDocumentAs(contents: string, suggestedName: string): Promise<SavedDocument | null>
}

export class DocumentFileError extends Error {
  override readonly name = 'DocumentFileError'
}

/** Everything the app needs from the platform it runs on. */
export interface Platform {
  readonly files: DocumentFileSystem
  /**
   * Opens an http(s) or mailto URL in the system browser / mail app, never inside
   * the app window. Callers must pass only URLs classified as external.
   */
  readonly openExternalUrl: (url: string) => Promise<void>
  /** Opens the print dialog (which offers "Save as PDF"). */
  readonly print: () => void
}
