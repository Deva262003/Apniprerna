import { describe, it, expect } from 'vitest'
import TimeRestrictionsManager from '../background/time-restrictions.js'

describe('TimeRestrictionsManager', () => {
  it('parses HH:MM to minutes', () => {
    const manager = new TimeRestrictionsManager()
    expect(manager.parseTime('09:30')).toBe(570)
    expect(manager.parseTime('00:15')).toBe(15)
  })

  it('formats minutes to HH:MM', () => {
    const manager = new TimeRestrictionsManager()
    expect(manager.formatTime(570)).toBe('09:30')
    expect(manager.formatTime(15)).toBe('00:15')
  })
})
