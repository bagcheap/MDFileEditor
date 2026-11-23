import type { Element, Root } from 'hast'
import type { Html } from 'mdast'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype'
import { unified } from 'unified'
import { classifyImageSource, classifyLink } from './links'

export interface RenderOptions {
  /** Load https images from the internet. Off by default (privacy). */
  allowRemoteImages?: boolean
}

export interface RenderResult {
  /** Sanitized HTML syntax tree, safe to turn into DOM/React elements. */
  tree: Root
  /** Number of remote images that were not loaded. */
  blockedRemoteImages: number
}

/**
 * Embedded HTML is not rendered yet (planned for a later phase, sanitized).
 * Rather than silently hiding it, show its source as code so no content
 * disappears from view.
 */
type HtmlHandler = NonNullable<NonNullable<RemarkRehypeOptions['handlers']>['html']>
const showRawHtmlAsCode: HtmlHandler = (_state, node: Html, parent) => {
  const code: Element = {
    type: 'element',
    tagName: 'code',
    properties: { className: ['raw-html'] },
    children: [{ type: 'text', value: node.value }],
  }
  const isBlock = parent === undefined || parent.type !== 'paragraph'
  return isBlock ? { type: 'element', tagName: 'pre', properties: {}, children: [code] } : code
}

/** GitHub's sanitize schema, plus the one class name we add for raw HTML. */
const schema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Replaces GitHub's `['className', /^language-./]` rule (only one rule per attribute is used).
    code: [['className', /^language-./, 'raw-html']],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // The sanitizer adds the "user-content-" id prefix; don't add it twice.
  .use(remarkRehype, { clobberPrefix: '', handlers: { html: showRawHtmlAsCode } })
  .use(rehypeSlug)
  // Everything above may contain document-controlled data; sanitize it all.
  .use(rehypeSanitize, schema)
  // Below this line only trusted transforms run on already-sanitized output.
  .use(rehypeHighlight, { detect: false })

function placeholder(text: string, title: string): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['image-placeholder'], title },
    children: [{ type: 'text', value: text }],
  }
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Adds a hover title so you can see where a link goes before clicking it. */
function describeLink(link: Element): void {
  const href = textOf(link.properties.href)
  switch (classifyLink(href)) {
    case 'external':
      link.properties.title ??= href
      break
    case 'unsupported':
      link.properties.className = ['link-unsupported']
      link.properties.title = `Links to other files aren't supported yet: ${href}`
      break
    case 'fragment':
      break
  }
}

/** Exposes a code block's language (from `language-xyz`) for display as a label. */
function labelCodeLanguage(pre: Element): void {
  const code = pre.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
  const classes = code?.properties.className
  if (!Array.isArray(classes)) return
  for (const name of classes) {
    if (typeof name === 'string' && name.startsWith('language-')) {
      pre.properties.dataLanguage = name.slice('language-'.length)
      return
    }
  }
}

/** Applies the link and image policies to sanitized output. */
function applyPolicies(tree: Root, allowRemote: boolean): number {
  let blocked = 0

  const replacementFor = (img: Element): Element => {
    const src = textOf(img.properties.src)
    const alt = textOf(img.properties.alt)
    const label = alt || src
    switch (classifyImageSource(src)) {
      case 'remote-secure':
        if (allowRemote) {
          img.properties.referrerPolicy = 'no-referrer'
          img.properties.loading = 'lazy'
          return img
        }
        blocked++
        return placeholder(`🖼 ${label}`, `Remote image not loaded: ${src}`)
      case 'remote-insecure':
        return placeholder(`🖼 ${label}`, `Insecure (http) image not loaded: ${src}`)
      case 'local':
        return placeholder(`🖼 ${label}`, `Local images are not shown yet: ${src}`)
      case 'missing':
        return placeholder(`🖼 ${alt || 'image'}`, 'Image source was removed as unsafe')
    }
  }

  const visit = (node: Root | Element): void => {
    node.children.forEach((child, index) => {
      if (child.type !== 'element') return
      if (child.tagName === 'img') {
        node.children[index] = replacementFor(child)
        return
      }
      if (child.tagName === 'a') describeLink(child)
      if (child.tagName === 'pre') labelCodeLanguage(child)
      visit(child)
    })
  }

  visit(tree)
  return blocked
}

/**
 * Renders Markdown (CommonMark + GitHub Flavored Markdown) into a sanitized
 * HTML syntax tree. Pure: no DOM, no network, no file access.
 */
export function renderMarkdown(markdown: string, options: RenderOptions = {}): RenderResult {
  const tree = processor.runSync(processor.parse(markdown))
  const blockedRemoteImages = applyPolicies(tree, options.allowRemoteImages === true)
  return { tree, blockedRemoteImages }
}
