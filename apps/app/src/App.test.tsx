import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DocumentFileSystem, DocumentRef } from '@mdedit/platform'
import { App } from './App'

afterEach(cleanup)

function fakeFs(overrides: Partial<DocumentFileSystem> = {}): DocumentFileSystem {
  const ref = {} as DocumentRef
  return {
    kind: 'web',
    canSaveInPlace: true,
    openDocument: vi.fn(() => Promise.resolve({ name: 'notes.md', contents: '# Notes', ref })),
    saveDocument: vi.fn(() => Promise.resolve()),
    saveDocumentAs: vi.fn(() => Promise.resolve({ name: 'new.md', ref })),
    ...overrides,
  }
}

const source = () => screen.getByLabelText<HTMLTextAreaElement>('Document source')

describe('App', () => {
  it('opens, edits and saves a document', async () => {
    const fs = fakeFs()
    render(<App fs={fs} />)

    fireEvent.click(screen.getByText('Open…'))
    await waitFor(() => {
      expect(source().value).toBe('# Notes')
    })
    expect(screen.queryByLabelText('unsaved changes')).toBeNull()

    fireEvent.change(source(), { target: { value: '# Notes\nmore' } })
    expect(screen.getByLabelText('unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(screen.queryByLabelText('unsaved changes')).toBeNull()
    })
    expect(fs.saveDocument).toHaveBeenCalledWith(expect.anything(), '# Notes\nmore')
  })

  it('uses Save As for a document that was never saved', async () => {
    const fs = fakeFs()
    render(<App fs={fs} />)
    fireEvent.change(source(), { target: { value: 'hello' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(fs.saveDocumentAs).toHaveBeenCalledWith('hello', 'Untitled.md')
    })
  })

  it('shows file errors instead of failing silently', async () => {
    const fs = fakeFs({
      openDocument: () => Promise.reject(new Error('File is not valid UTF-8 text')),
    })
    render(<App fs={fs} />)
    fireEvent.click(screen.getByText('Open…'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/UTF-8/)
  })

  it('asks before discarding unsaved changes', async () => {
    const fs = fakeFs()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App fs={fs} />)
    fireEvent.change(source(), { target: { value: 'draft' } })
    fireEvent.click(screen.getByText('Open…'))
    await waitFor(() => {
      expect(confirm).toHaveBeenCalled()
    })
    expect(fs.openDocument).not.toHaveBeenCalled()
    expect(source().value).toBe('draft')
  })
})
