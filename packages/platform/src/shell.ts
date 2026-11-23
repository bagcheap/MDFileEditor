import type { Invoke } from './desktop'

/** Desktop: Rust re-validates the URL and hands it to the OS (`open` on macOS). */
export function desktopOpenExternalUrl(call: Invoke) {
  return async (url: string): Promise<void> => {
    await call('open_external_url', { url })
  }
}

/** Web: a new tab with no access back to this page. */
export function webOpenExternalUrl(win: Pick<Window, 'open'>) {
  return (url: string): Promise<void> => {
    win.open(url, '_blank', 'noopener,noreferrer')
    return Promise.resolve()
  }
}
