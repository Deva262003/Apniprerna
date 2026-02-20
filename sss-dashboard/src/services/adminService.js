import api from './api'

export const getAdmins = () => api.get('/admins')
export const getAdmin = (id) => api.get(`/admins/${id}`)
export const createAdmin = (data) => api.post('/admins', data)
export const updateAdmin = (id, data) => api.put(`/admins/${id}`, data)
export const deleteAdmin = (id) => api.delete(`/admins/${id}`)

export const sendCommand = (data) => api.post('/admin/commands', data)
export const getCommandHistory = (params) => api.get('/admin/commands', { params })
export const forceLogoutStudent = (studentId) =>
  api.post('/admin/commands', {
    type: 'FORCE_LOGOUT',
    targetType: 'student',
    targetId: studentId
  })
