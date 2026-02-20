import { describe, it, expect, beforeEach } from 'vitest'
import useActivityStore from './activityStore'

describe('activityStore', () => {
  beforeEach(() => {
    useActivityStore.setState({
      activities: [],
      filters: {},
      onlineStudents: {},
      heartbeats: {}
    })
  })

  it('prepends activities and caps list', () => {
    const activity = { id: 1, url: 'https://example.com' }
    useActivityStore.getState().prependActivity(activity)
    expect(useActivityStore.getState().activities.length).toBe(1)
    expect(useActivityStore.getState().activities[0]).toEqual(activity)
  })

  it('tracks online students', () => {
    useActivityStore.getState().setStudentOnline({
      studentId: '123',
      studentName: 'Test Student'
    })

    expect(useActivityStore.getState().onlineStudents['123'].isOnline).toBe(true)

    useActivityStore.getState().setStudentOffline('123')
    expect(useActivityStore.getState().onlineStudents['123'].isOnline).toBe(false)
  })

  it('marks student online when heartbeat arrives', () => {
    useActivityStore.getState().setHeartbeat({
      studentId: '456',
      studentName: 'Heartbeat Student',
      lastSeen: '2026-01-01T10:00:00.000Z'
    })

    expect(useActivityStore.getState().heartbeats['456'].studentId).toBe('456')
    expect(useActivityStore.getState().onlineStudents['456'].isOnline).toBe(true)
    expect(useActivityStore.getState().onlineStudents['456'].studentName).toBe('Heartbeat Student')
  })
})
