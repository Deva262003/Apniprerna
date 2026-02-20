import { describe, expect, it } from 'vitest'
import { getActiveSessions } from './liveUtils'

describe('getActiveSessions', () => {
  const students = [
    { _id: 's1', name: 'Asha', studentId: '1001', center: { _id: 'c1' } },
    { _id: 's2', name: 'Bharat', studentId: '1002', center: { _id: 'c1' } },
    { _id: 's3', name: 'Chitra', studentId: '1003', center: { _id: 'c2' } }
  ]

  it('returns only online students', () => {
    const result = getActiveSessions(students, {
      s1: { isOnline: true },
      s2: { isOnline: false },
      s3: { isOnline: true }
    })

    expect(result.map((s) => s._id)).toEqual(['s1', 's3'])
  })

  it('applies center and search filters before online filtering', () => {
    const result = getActiveSessions(
      students,
      {
        s1: { isOnline: true },
        s2: { isOnline: true },
        s3: { isOnline: true }
      },
      'bharat',
      'c1'
    )

    expect(result.map((s) => s._id)).toEqual(['s2'])
  })
})
