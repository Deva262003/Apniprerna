import { describe, expect, it } from 'vitest'
import { filterCentersByStateAndSearch, filterStudentsByScopeAndSearch } from './dashboardFilters'

describe('dashboard filter helpers', () => {
  const centers = [
    { _id: 'c1', name: 'Pune Pod', state: 'Maharashtra' },
    { _id: 'c2', name: 'Nagpur Pod', state: 'Maharashtra' },
    { _id: 'c3', name: 'Jaipur Pod', state: 'Rajasthan' }
  ]

  const students = [
    { _id: 's1', name: 'Asha', studentId: '1001', center: { _id: 'c1' } },
    { _id: 's2', name: 'Bharat', studentId: '1002', center: { _id: 'c2' } },
    { _id: 's3', name: 'Chitra', studentId: '1003', center: { _id: 'c3' } }
  ]

  it('filters centers by selected state and search', () => {
    const result = filterCentersByStateAndSearch(centers, 'Maharashtra', 'nagpur')
    expect(result.map((center) => center._id)).toEqual(['c2'])
  })

  it('filters students by selected state and center scope', () => {
    const result = filterStudentsByScopeAndSearch(students, centers, 'Maharashtra', ['c1'], '')
    expect(result.map((student) => student._id)).toEqual(['s1'])
  })
})
