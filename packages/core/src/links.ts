/** How a link in a rendered document should behave when clicked. */
export type LinkKind =
  /** In-document anchor, e.g. "#installation". */
  | 'fragment'
  /** Web or mail link; opened in the system browser / mail app. */
  | 'external'
  /** Anything else (relative file links, unsupported schemes). Not followed. */
  | 'unsupported'

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function classifyLink(href: string): LinkKind {
  if (href.startsWith('#')) return 'fragment'
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return 'unsupported' // relative path such as "other.md"
  }
  if (!EXTERNAL_PROTOCOLS.has(url.protocol)) return 'unsupported'
  // Links with embedded credentials (https://user:pass@host) are a phishing trick.
  if (url.username !== '' || url.password !== '') return 'unsupported'
  return 'external'
}

/** How an image source should be treated. */
export type ImageKind = 'remote-secure' | 'remote-insecure' | 'local' | 'missing'

export function classifyImageSource(src: string | undefined): ImageKind {
  if (src === undefined || src === '') return 'missing'
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return 'local' // relative path such as "assets/diagram.png"
  }
  if (url.protocol === 'https:') return 'remote-secure'
  if (url.protocol === 'http:') return 'remote-insecure'
  return 'local' // file: and other schemes are treated like local files
}
