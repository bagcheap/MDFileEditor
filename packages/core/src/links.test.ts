import { describe, expect, it } from 'vitest'
import { classifyImageSource, classifyLink } from './links'

describe('classifyLink', () => {
  it.each([
    ['#intro', 'fragment'],
    ['https://example.com/a?b#c', 'external'],
    ['http://example.com', 'external'],
    ['mailto:me@example.com', 'external'],
    ['other.md', 'unsupported'],
    ['../docs/x.md#y', 'unsupported'],
    ['file:///etc/passwd', 'unsupported'],
    ['javascript:alert(1)', 'unsupported'],
    ['https://user:pass@example.com', 'unsupported'],
  ] as const)('%s → %s', (href, kind) => {
    expect(classifyLink(href)).toBe(kind)
  })
})

describe('classifyImageSource', () => {
  it.each([
    ['https://example.com/a.png', 'remote-secure'],
    ['http://example.com/a.png', 'remote-insecure'],
    ['assets/a.png', 'local'],
    ['file:///Users/me/a.png', 'local'],
    ['', 'missing'],
    [undefined, 'missing'],
  ] as const)('%s → %s', (src, kind) => {
    expect(classifyImageSource(src)).toBe(kind)
  })
})
