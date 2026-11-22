import { describe, expect, it, vi } from 'vitest'
import { createDesktopFs, type Invoke } from './desktop'

describe('desktop implementation', () => {
  it('passes the native path back to Rust when saving, without exposing it', async () => {
    const call = vi.fn((command: string) =>
      Promise.resolve(
        command === 'open_document'
          ? { path: '/Users/me/a.md', name: 'a.md', contents: 'hello' }
          : null,
      ),
    ) as unknown as Invoke & ReturnType<typeof vi.fn>
    const fs = createDesktopFs(call)

    const opened = await fs.openDocument()
    expect(opened).toMatchObject({ name: 'a.md', contents: 'hello' })
    expect(Object.keys(opened?.ref ?? {})).toEqual([])

    if (!opened) throw new Error('unreachable')
    await fs.saveDocument(opened.ref, 'bye')
    expect(call).toHaveBeenLastCalledWith('save_document', {
      path: '/Users/me/a.md',
      contents: 'bye',
    })
  })

  it('turns string errors from Rust into Error objects', async () => {
    const fs = createDesktopFs(() => Promise.reject(new Error('denied')))
    await expect(fs.openDocument()).rejects.toThrow('denied')
    const fs2 = createDesktopFs(() => Promise.reject('plain string'))
    await expect(fs2.openDocument()).rejects.toThrow('plain string')
  })
})
