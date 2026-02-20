import { useCallback, useEffect, useState } from 'react'
import {
  connectSocket,
  getSocket,
  joinCenterRoom,
  joinAlertsRoom,
  onEvent,
  emitEvent
} from '../services/websocketService'

const useWebSocket = () => {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const socket = connectSocket()

    const handleConnect = () => {
      setConnected(true)
      setError(null)
    }
    const handleDisconnect = () => {
      setConnected(false)
    }
    const handleError = (err) => {
      setConnected(false)
      setError(err?.message || 'WebSocket error')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleError)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleError)
    }
  }, [])

  const joinCenter = useCallback((centerId) => joinCenterRoom(centerId), [])
  const joinAlerts = useCallback(() => joinAlertsRoom(), [])
  const emit = useCallback((event, payload) => emitEvent(event, payload), [])
  const on = useCallback((event, handler) => onEvent(event, handler), [])

  return {
    socket: getSocket(),
    connected,
    error,
    joinCenter,
    joinAlerts,
    emit,
    on
  }
}

export default useWebSocket
