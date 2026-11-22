import { describe, expect, it } from 'vitest'
import { MAX_DOCUMENT_BYTES, decodeDocument } from './encoding'
import { DocumentFileError } from './types'

const bytes = (...values: number[]) => new Uint8Array(values).buffer

describe('decodeDocument', () => {
  it('decodes UTF-8 text exactly', () => {
    const text = '# Héllo 👋\r\n\n- item\n'
    expect(decodeDocument(new TextEncoder().encode(text).buffer)).toBe(text)
  })

  it('keeps a leading byte-order mark so it round-trips', () => {
    expect(decodeDocument(bytes(0xef, 0xbb, 0xbf, 0x41))).toBe('﻿A')
  })

  it('refuses invalid UTF-8 instead of replacing bytes', () => {
    expect(() => decodeDocument(bytes(0x41, 0xff, 0x42))).toThrow(DocumentFileError)
  })

  it('refuses files over the size limit', () => {
    expect(() => decodeDocument(new ArrayBuffer(MAX_DOCUMENT_BYTES + 1))).toThrow(/too large/)
  })
})
