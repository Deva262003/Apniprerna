import api from './api'

export const getPolicies = () => api.get('/policies')
export const getPolicy = (id) => api.get(`/policies/${id}`)
export const createPolicy = (data) => api.post('/policies', data)
export const updatePolicy = (id, data) => api.put(`/policies/${id}`, data)
export const deletePolicy = (id) => api.delete(`/policies/${id}`)
export const togglePolicy = (id) => api.patch(`/policies/${id}/toggle`)
