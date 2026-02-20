import { useEffect } from 'react'
import toast from 'react-hot-toast'
import useWebSocket from './useWebSocket'
import useNotificationStore from '../store/notificationStore'

const useNotifications = ({ enabled = true } = {}) => {
  const { on } = useWebSocket()
  const notifications = useNotificationStore((state) => state.notifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const addNotification = useNotificationStore((state) => state.addNotification)

  useEffect(() => {
    if (!enabled) return undefined
    const unsubscribe = on('blocked_attempt', (payload) => {
      const notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'blocked_attempt',
        message: `${payload.studentName || payload.student} blocked: ${payload.url}`,
        data: payload,
        timestamp: new Date().toISOString(),
        read: false
      }
      addNotification(notification)
      toast.error(notification.message, { duration: 5000 })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [enabled, on, addNotification])

  return { notifications, unreadCount }
}

export default useNotifications
