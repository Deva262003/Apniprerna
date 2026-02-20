import { io } from 'socket.io-client'

let socketInstance = null

const resolveSocketUrl = () => {
  const explicitUrl = import.meta.env.VITE_SOCKET_URL
  if (explicitUrl) return explicitUrl

  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase && apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/v1\/?$/, '')
  }

  return window.location.origin
}

export const connectSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })
  }

  if (!socketInstance.connected) {
    socketInstance.connect()
  }

  return socketInstance
}

export const getSocket = () => socketInstance

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
  }
}

export const joinCenterRoom = (centerId) => {
  if (socketInstance && centerId) {
    socketInstance.emit('join:center', centerId)
  }
}

export const joinAlertsRoom = () => {
  if (socketInstance) {
    socketInstance.emit('join:alerts')
  }
}

export const onEvent = (event, handler) => {
  if (!socketInstance) return () => {}
  socketInstance.on(event, handler)
  return () => socketInstance.off(event, handler)
}

export const emitEvent = (event, payload) => {
  if (socketInstance) {
    socketInstance.emit(event, payload)
  }
}
