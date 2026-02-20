import parentApi from './parentApi'

export const parentLogin = (parentId, password) =>
  parentApi.post('/auth/parent/login', { parentId, password })

export const getParentMe = () => parentApi.get('/auth/parent/me')

export const changeParentPassword = (currentPassword, newPassword) =>
  parentApi.post('/parent/me/change-password', { currentPassword, newPassword })

export const getParentStudents = () => parentApi.get('/parent/students')

export const getParentStudentStats = (studentId) =>
  parentApi.get(`/parent/students/${studentId}/stats`)

export const getParentStudentActivity = (studentId, params) =>
  parentApi.get(`/parent/students/${studentId}/activity`, { params })

export const parentForceLogout = (studentId) =>
  parentApi.post(`/parent/students/${studentId}/force-logout`)
