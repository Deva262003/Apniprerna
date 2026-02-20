import api from './api'

export const getParents = (params) => api.get('/parents', { params })
export const getParent = (id) => api.get(`/parents/${id}`)
export const createParent = (data) => api.post('/parents', data)
export const updateParent = (id, data) => api.put(`/parents/${id}`, data)
export const resetParentPassword = (id) => api.post(`/parents/${id}/reset-password`)
