import { describe, expect, it, vi } from 'vitest'
import type { Invoke } from './desktop'
import { desktopOpenExternalUrl, webOpenExternalUrl } from './shell'

describe('openExternalUrl', () => {
  it('desktop: delegates to the Rust command', async () => {
    const call = vi.fn(() => Promise.resolve()) as unknown as Invoke
    await desktopOpenExternalUrl(call)('https://example.com')
    expect(call).toHaveBeenCalledWith('open_external_url', { url: 'https://example.com' })
  })

  it('web: opens a new tab without giving it a reference back to the app', async () => {
    const open = vi.fn(() => null)
    await webOpenExternalUrl({ open })('https://example.com')
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
  })
})
