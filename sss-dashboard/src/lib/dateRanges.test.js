import { describe, expect, it } from 'vitest'
import { getDateRangeForPreset } from './dateRanges'

describe('getDateRangeForPreset', () => {
  const fixedNow = new Date('2026-02-11T10:00:00.000Z')

  it('returns last 7 days by default', () => {
    expect(getDateRangeForPreset('7d', fixedNow)).toEqual({
      startDate: '2026-02-05',
      endDate: '2026-02-11'
    })
  })

  it('returns last 30 days preset', () => {
    expect(getDateRangeForPreset('30d', fixedNow)).toEqual({
      startDate: '2026-01-13',
      endDate: '2026-02-11'
    })
  })
})
