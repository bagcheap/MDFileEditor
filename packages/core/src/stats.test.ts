import { describe, expect, it } from 'vitest'
import { documentStats } from './stats'

describe('documentStats', () => {
  it('counts words, ignoring Markdown syntax', () => {
    expect(documentStats('# Hello world\n\n- one\n- two\n\n---\n\n| a | b |').words).toBe(6)
  })

  it('treats contractions and hyphenated words as one word', () => {
    expect(documentStats("don't re-run it").words).toBe(3)
  })

  it('counts non-whitespace characters', () => {
    expect(documentStats('a b\nc').characters).toBe(3)
  })

  it('estimates reading time', () => {
    expect(documentStats('').readingMinutes).toBe(0)
    expect(documentStats('word').readingMinutes).toBe(1)
    expect(documentStats('word '.repeat(2300)).readingMinutes).toBe(10)
  })
})
