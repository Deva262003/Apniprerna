import { describe, expect, it } from 'vitest'
import { filterQuickActionsByRole, isQuickActionAllowed } from './quickActions'

describe('quick action permissions', () => {
  const actions = [
    { id: 'add-center', roles: ['super_admin'] },
    { id: 'add-student', roles: ['super_admin', 'admin', 'pod_admin'] },
    { id: 'help' }
  ]

  it('allows actions without explicit role restrictions', () => {
    expect(isQuickActionAllowed('viewer', actions[2])).toBe(true)
  })

  it('filters actions by role', () => {
    const podAdminActions = filterQuickActionsByRole(actions, 'pod_admin')
    expect(podAdminActions.map((action) => action.id)).toEqual(['add-student', 'help'])
  })
})
