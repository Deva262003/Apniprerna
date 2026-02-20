import { describe, expect, it } from 'vitest'
import { isValidPhoneNumber } from './validation'

describe('isValidPhoneNumber', () => {
  it('accepts exactly 10 digits', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true)
  })

  it('rejects non-digit or wrong length values', () => {
    expect(isValidPhoneNumber('98765')).toBe(false)
    expect(isValidPhoneNumber('98765432101')).toBe(false)
    expect(isValidPhoneNumber('98765abc10')).toBe(false)
  })
})
