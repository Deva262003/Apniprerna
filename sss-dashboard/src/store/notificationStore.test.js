import { describe, it, expect, beforeEach } from 'vitest'
import useNotificationStore from './notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 })
  })

  it('adds notifications and increments unread', () => {
    useNotificationStore.getState().addNotification({
      id: '1',
      message: 'Blocked attempt',
      read: false
    })

    const state = useNotificationStore.getState()
    expect(state.notifications.length).toBe(1)
    expect(state.unreadCount).toBe(1)
  })

  it('marks notifications as read', () => {
    useNotificationStore.getState().addNotification({
      id: '1',
      message: 'Blocked attempt',
      read: false
    })
    useNotificationStore.getState().markAsRead('1')

    const state = useNotificationStore.getState()
    expect(state.notifications[0].read).toBe(true)
    expect(state.unreadCount).toBe(0)
  })
})
