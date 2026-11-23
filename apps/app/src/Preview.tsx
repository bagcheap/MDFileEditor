import { useDeferredValue, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { classifyLink, renderMarkdown } from '@mdedit/core'
import { ImageIcon } from './ui/icons'

interface PreviewProps {
  text: string
  openExternalUrl: (url: string) => Promise<void>
  onError: (message: string) => void
}

/**
 * Formatted, read-only view of the document. The Markdown is rendered to a
 * sanitized syntax tree and converted straight to React elements, so no HTML
 * string is ever injected into the page.
 */
export function Preview({ text, openExternalUrl, onError }: PreviewProps) {
  // Remote images are off for every newly opened document (the parent remounts
  // this component per document).
  const [allowRemoteImages, setAllowRemoteImages] = useState(false)
  // Keeps typing responsive on large documents: render the latest text when idle.
  const deferredText = useDeferredValue(text)
  const articleRef = useRef<HTMLElement>(null)

  const { tree, blockedRemoteImages } = useMemo(
    () => renderMarkdown(deferredText, { allowRemoteImages }),
    [deferredText, allowRemoteImages],
  )
  // toJsxRuntime's declared return type refers to the global JSX namespace, which
  // React 19 removed; the value is a React element.
  const content = useMemo(() => toJsxRuntime(tree, { Fragment, jsx, jsxs }) as ReactNode, [tree])

  // Links never navigate the app window: anchors scroll within the document,
  // web/mail links open outside the app, anything else does nothing.
  const onLinkClick = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return
    const anchor = event.target.closest('a')
    const article = articleRef.current
    if (!anchor || !article?.contains(anchor)) return
    event.preventDefault()
    if (event.type !== 'click') return // middle-click etc.: just block it

    const href = anchor.getAttribute('href') ?? ''
    switch (classifyLink(href)) {
      case 'fragment': {
        const name = safeDecode(href.slice(1))
        const target =
          document.getElementById(`user-content-${name}`) ?? document.getElementById(name)
        if (target && article.contains(target)) target.scrollIntoView({ block: 'start' })
        break
      }
      case 'external':
        openExternalUrl(href).catch((e: unknown) => {
          onError(e instanceof Error ? e.message : String(e))
        })
        break
      case 'unsupported':
        break
    }
  }

  return (
    <div className="scroll-area">
      <article
        ref={articleRef}
        className="markdown-body"
        onClick={onLinkClick}
        onAuxClick={onLinkClick}
      >
        {blockedRemoteImages > 0 && !allowRemoteImages && (
          <aside className="notice" role="status">
            <span className="notice-icon">
              <ImageIcon />
            </span>
            <span className="notice-text">
              {blockedRemoteImages === 1
                ? '1 image from the internet was not loaded.'
                : `${String(blockedRemoteImages)} images from the internet were not loaded.`}{' '}
              <span className="notice-detail">
                Loading images lets their host see that you opened this file.
              </span>
            </span>
            <button
              type="button"
              className="button button-small"
              onClick={() => {
                setAllowRemoteImages(true)
              }}
            >
              Load images
            </button>
          </aside>
        )}
        {deferredText.trim() === '' ? (
          <p className="empty-hint">
            This document is empty. Switch to <strong>Source</strong> to start writing.
          </p>
        ) : (
          content
        )}
      </article>
    </div>
  )
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
