import { toHtml } from 'hast-util-to-html'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'

const html = (md: string, allowRemoteImages = false) =>
  toHtml(renderMarkdown(md, { allowRemoteImages }).tree)

describe('renderMarkdown: formatting', () => {
  it('renders CommonMark basics', () => {
    const out = html(
      '# Title\n\nSome *em* and **strong** and `code`.\n\n> quote\n\n---\n\n1. one\n2. two',
    )
    expect(out).toContain('<h1 id="user-content-title">Title</h1>')
    expect(out).toContain('<em>em</em>')
    expect(out).toContain('<strong>strong</strong>')
    expect(out).toContain('<code>code</code>')
    expect(out).toContain('<blockquote>')
    expect(out).toContain('<hr>')
    expect(out).toContain('<ol>')
  })

  it('renders GFM tables, task lists, strikethrough and autolinks', () => {
    const out = html(
      '| a | b |\n|---|:-:|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~\n\nSee https://example.com',
    )
    expect(out).toContain('<table>')
    expect(out).toContain('<td align="center">2</td>')
    expect(out).toMatch(/<input type="checkbox" checked disabled>/)
    expect(out).toContain('<del>old</del>')
    expect(out).toContain(
      '<a href="https://example.com" title="https://example.com">https://example.com</a>',
    )
  })

  it('renders footnotes with working in-document links', () => {
    const out = html('Text[^1]\n\n[^1]: Note')
    // Links use the plain name; the viewer resolves them to the prefixed id.
    expect(out).toContain('href="#fn-1"')
    expect(out).toContain('id="user-content-fn-1"')
    expect(out).toContain('href="#fnref-1"')
    expect(out).toContain('id="user-content-fnref-1"')
  })

  it('highlights code blocks with a known language and leaves others plain', () => {
    const out = html('```js\nconst x = 1\n```\n\n```\nplain\n```')
    expect(out).toContain('class="hljs language-js"')
    expect(out).toContain('<span class="hljs-keyword">const</span>')
    expect(out).toContain('<code>plain\n</code>')
  })

  it('labels code blocks with their language', () => {
    expect(html('```python\nx = 1\n```')).toContain('<pre data-language="python">')
    expect(html('```\nplain\n```')).toContain('<pre><code>')
  })

  it('shows embedded HTML as visible source instead of rendering or dropping it', () => {
    const block = html('<div class="note">Hello</div>')
    expect(block).toContain(
      '<pre><code class="raw-html">&#x3C;div class="note">Hello&#x3C;/div></code></pre>',
    )
    const inline = html('Press <kbd>Ctrl</kbd> now')
    expect(inline).toContain('<code class="raw-html">&#x3C;kbd></code>')
  })
})

describe('renderMarkdown: links', () => {
  it('keeps an author-provided link title', () => {
    expect(html('[x](https://e.com "Home")')).toContain('title="Home"')
  })

  it('marks links to other files as not supported yet', () => {
    const out = html('[next](chapter-2.md)')
    expect(out).toContain('class="link-unsupported"')
    expect(out).toContain('Links to other files aren&#x27;t supported yet: chapter-2.md')
  })
})

describe('renderMarkdown: security', () => {
  it.each([
    ['script tag', '<script>alert(1)</script>'],
    ['event handler', '<img src=x onerror="alert(1)">'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['svg', '<svg onload="alert(1)"></svg>'],
  ])('never produces live HTML from %s', (_name, md) => {
    const tree = renderMarkdown(md).tree
    const out = toHtml(tree)
    expect(out).not.toMatch(/<(script|iframe|svg|img)\b/i)
    // The source is shown as text instead.
    expect(out).toContain('raw-html')
  })

  it.each([
    ['javascript:', '[x](javascript:alert(1))'],
    ['JaVaScRiPt: with entities', '[x](&#106;avascript:alert(1))'],
    ['vbscript:', '[x](vbscript:msgbox)'],
    ['data:', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
  ])('strips dangerous %s link targets', (_name, md) => {
    const out = html(md)
    expect(out).not.toMatch(/href="[^"]*(script|data):/i)
  })

  it('does not load remote images unless allowed, and counts them', () => {
    const md = '![logo](https://example.com/a.png) ![b](https://example.com/b.png)'
    const blocked = renderMarkdown(md)
    expect(blocked.blockedRemoteImages).toBe(2)
    expect(toHtml(blocked.tree)).not.toContain('<img')
    expect(toHtml(blocked.tree)).toContain('🖼 logo')

    const allowed = renderMarkdown(md, { allowRemoteImages: true })
    expect(allowed.blockedRemoteImages).toBe(0)
    expect(toHtml(allowed.tree)).toContain(
      '<img src="https://example.com/a.png" alt="logo" referrerpolicy="no-referrer" loading="lazy">',
    )
  })

  it('never loads insecure http, data: or local images (local support comes later)', () => {
    const out = html(
      '![a](http://example.com/a.png) ![b](data:image/png;base64,AAAA) ![c](assets/c.png)',
      true,
    )
    expect(out).not.toContain('<img')
    expect(out).toContain('Insecure (http) image not loaded')
    expect(out).toContain('Local images are not shown yet: assets/c.png')
  })

  it('prefixes generated ids so documents cannot clobber page globals', () => {
    expect(html('# location')).toContain('id="user-content-location"')
  })
})

describe('renderMarkdown: robustness', () => {
  it('handles empty input', () => {
    expect(html('')).toBe('')
  })

  it('handles a large document quickly', () => {
    const md = '## Section\n\nSome **text** with a [link](https://example.com).\n\n'.repeat(5000)
    const start = performance.now()
    renderMarkdown(md)
    expect(performance.now() - start).toBeLessThan(5000)
  })
})
