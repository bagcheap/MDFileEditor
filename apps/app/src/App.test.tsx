import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DocumentFileSystem, DocumentRef, Platform } from '@mdedit/platform'
import { App } from './App'

afterEach(cleanup)

function fakePlatform(contents = '# Notes', files: Partial<DocumentFileSystem> = {}) {
  const ref = {} as DocumentRef
  const platform = {
    files: {
      kind: 'web',
      canSaveInPlace: true,
      openDocument: vi.fn(() => Promise.resolve({ name: 'notes.md', contents, ref })),
      saveDocument: vi.fn(() => Promise.resolve()),
      saveDocumentAs: vi.fn(() => Promise.resolve({ name: 'new.md', ref })),
      ...files,
    },
    openExternalUrl: vi.fn(() => Promise.resolve()),
    print: vi.fn(),
  } satisfies Platform
  return platform
}

const source = () => screen.getByLabelText<HTMLTextAreaElement>('Document source')
const tab = (name: string) => screen.getByRole('tab', { name })

async function openDoc() {
  fireEvent.click(screen.getByText('Open…'))
  await screen.findByText('notes.md')
  await waitFor(() => {
    expect(document.querySelector('.empty-hint')).toBeNull()
  })
}

describe('App: files', () => {
  it('opens a document into the formatted preview', async () => {
    render(<App platform={fakePlatform('# Hello\n\nSome **bold** text')} />)
    await openDoc()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hello')
    expect(tab('Preview').getAttribute('aria-selected')).toBe('true')
    expect(document.title).toBe('notes')
  })

  it('edits in Source and saves', async () => {
    const platform = fakePlatform()
    render(<App platform={platform} />)
    await openDoc()
    fireEvent.click(tab('Source'))
    expect(source().value).toBe('# Notes')

    fireEvent.change(source(), { target: { value: '# Notes\nmore' } })
    expect(screen.getByLabelText('unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(screen.queryByLabelText('unsaved changes')).toBeNull()
    })
    expect(platform.files.saveDocument).toHaveBeenCalledWith(expect.anything(), '# Notes\nmore')
  })

  it('shows edits from Source in the preview', async () => {
    render(<App platform={fakePlatform()} />)
    fireEvent.click(tab('Source'))
    fireEvent.change(source(), { target: { value: '## Fresh heading' } })
    fireEvent.click(tab('Preview'))
    expect((await screen.findByRole('heading', { level: 2 })).textContent).toBe('Fresh heading')
  })

  it('uses Save As for a document that was never saved', async () => {
    const platform = fakePlatform()
    render(<App platform={platform} />)
    fireEvent.click(tab('Source'))
    fireEvent.change(source(), { target: { value: 'hello' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(platform.files.saveDocumentAs).toHaveBeenCalledWith('hello', 'Untitled.md')
    })
  })

  it('shows file errors instead of failing silently', async () => {
    const platform = fakePlatform('', {
      openDocument: () => Promise.reject(new Error('File is not valid UTF-8 text')),
    })
    render(<App platform={platform} />)
    fireEvent.click(screen.getByText('Open…'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/UTF-8/)
  })

  it('asks before discarding unsaved changes', async () => {
    const platform = fakePlatform()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App platform={platform} />)
    fireEvent.click(tab('Source'))
    fireEvent.change(source(), { target: { value: 'draft' } })
    fireEvent.click(screen.getByText('Open…'))
    await waitFor(() => {
      expect(confirm).toHaveBeenCalled()
    })
    expect(platform.files.openDocument).not.toHaveBeenCalled()
    expect(source().value).toBe('draft')
  })
})

describe('App: links', () => {
  it('opens web links outside the app and never navigates the window', async () => {
    const platform = fakePlatform('[site](https://example.com)')
    render(<App platform={platform} />)
    await openDoc()
    const link = screen.getByText('site')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(platform.openExternalUrl).toHaveBeenCalledWith('https://example.com')
  })

  it('does not follow links to other files', async () => {
    const platform = fakePlatform('[next](chapter-2.md)')
    render(<App platform={platform} />)
    await openDoc()
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    screen.getByText('next').dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(platform.openExternalUrl).not.toHaveBeenCalled()
  })

  it('scrolls to in-document anchors', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(<App platform={fakePlatform('[go](#target)\n\n## Target')} />)
    await openDoc()
    fireEvent.click(screen.getByText('go'))
    expect(scrollIntoView).toHaveBeenCalled()
  })
})

describe('App: remote images', () => {
  it('blocks them until the user chooses to load them', async () => {
    render(<App platform={fakePlatform('![chart](https://example.com/c.png)')} />)
    await openDoc()
    expect(document.querySelector('.markdown-body img')).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/1 image from the internet/)

    fireEvent.click(screen.getByText('Load images'))
    expect(document.querySelector('.markdown-body img')?.getAttribute('src')).toBe(
      'https://example.com/c.png',
    )
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('App: PDF export', () => {
  it('switches to the formatted view and opens the print dialog', async () => {
    const platform = fakePlatform()
    render(<App platform={platform} />)
    await openDoc()
    fireEvent.click(tab('Source'))
    fireEvent.click(screen.getByText('Export PDF…'))
    expect(platform.print).toHaveBeenCalledOnce()
    expect(tab('Preview').getAttribute('aria-selected')).toBe('true')
  })

  it('responds to ⌘P', () => {
    const platform = fakePlatform()
    render(<App platform={platform} />)
    fireEvent.keyDown(window, { key: 'p', metaKey: true })
    expect(platform.print).toHaveBeenCalledOnce()
  })
})
