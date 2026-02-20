import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (email, password) =>
  api.post('/auth/admin/login', { email, password })

export const changeAdminPassword = (currentPassword, newPassword) =>
  api.post('/auth/admin/change-password', { currentPassword, newPassword })

// Centers
export const getCenters = () => api.get('/centers')
export const getCenter = (id) => api.get(`/centers/${id}`)
export const syncCenters = () => api.post('/centers/sync-pms')
export const updateCenter = (id, data) => api.put(`/centers/${id}`, data)
export const deleteCenter = (id) => api.delete(`/centers/${id}`)


// Students
export const getStudents = (params) => api.get('/students', { params })
export const getStudent = (id) => api.get(`/students/${id}`)
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const getStudentActivity = (id, params) => api.get(`/students/${id}/activity`, { params })
export const getStudentStats = (id, params) => api.get(`/students/${id}/stats`, { params })

// Activity
export const getRecentActivity = (params) => api.get('/activity/recent', { params })
export const getActivityStats = (params) => api.get('/activity/stats', { params })
export const getActivityStateSummary = (params) => api.get('/activity/state-summary', { params })
export const getActivities = (params) => api.get('/activity', { params })
export const getBlockedActivity = (params) => api.get('/activity/blocked', { params })
export const getActivityCategories = (params) => api.get('/activity-categories', { params })
export const createActivityCategory = (data) => api.post('/activity-categories', data)
export const updateActivityCategory = (id, data) => api.put(`/activity-categories/${id}`, data)
export const deleteActivityCategory = (id) => api.delete(`/activity-categories/${id}`)
export const getActivityCategoryRules = (params) => api.get('/activity-category-rules', { params })
export const createActivityCategoryRule = (data) => api.post('/activity-category-rules', data)
export const updateActivityCategoryRule = (id, data) => api.put(`/activity-category-rules/${id}`, data)
export const deleteActivityCategoryRule = (id) => api.delete(`/activity-category-rules/${id}`)


// Center stats
export const getCenterStats = (id, params) => api.get(`/centers/${id}/stats`, { params })

// Blocklist
export const getBlockedSites = (params) => api.get('/blocklist', { params })
export const getBlockedSite = (id) => api.get(`/blocklist/${id}`)
export const createBlockedSite = (data) => api.post('/blocklist', data)
export const updateBlockedSite = (id, data) => api.put(`/blocklist/${id}`, data)
export const deleteBlockedSite = (id) => api.delete(`/blocklist/${id}`)
export const toggleBlockedSite = (id) => api.patch(`/blocklist/${id}/toggle`)
export const bulkCreateBlockedSites = (data) => api.post('/blocklist/bulk', data)
export const getBlocklistStats = () => api.get('/blocklist/stats/summary')

export default api
