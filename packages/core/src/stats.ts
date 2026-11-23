export interface DocumentStats {
  words: number
  characters: number
  /** Estimated minutes to read at ~230 words per minute (at least 1 if there are words). */
  readingMinutes: number
}

// A "word" is a run of letters/digits, optionally joined by apostrophes or hyphens.
// Markdown syntax on its own (#, -, *, |, ---) contains no letters, so it isn't counted.
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

export function documentStats(markdown: string): DocumentStats {
  const words = markdown.match(WORD)?.length ?? 0
  const characters = markdown.replace(/\s/g, '').length
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / 230))
  return { words, characters, readingMinutes }
}
