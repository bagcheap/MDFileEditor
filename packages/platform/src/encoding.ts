import { DocumentFileError } from './types'

/** Largest document we will open. Must match MAX_DOCUMENT_BYTES in src-tauri. */
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024

export const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown', 'mkd', 'txt'] as const

/**
 * Decodes bytes as UTF-8, refusing invalid input instead of silently replacing
 * bytes with U+FFFD (which would alter the document's text when saved back).
 */
export function decodeDocument(bytes: ArrayBuffer): string {
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new DocumentFileError(
      `File is too large to open (limit is ${String(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB).`,
    )
  }
  try {
    // ignoreBOM keeps a leading byte-order mark in the text so it round-trips.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    throw new DocumentFileError('File is not valid UTF-8 text, so it was not opened.')
  }
}
