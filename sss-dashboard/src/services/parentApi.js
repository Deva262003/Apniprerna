import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const parentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

parentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('parentToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

parentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('parentToken')
    }
    return Promise.reject(error)
  }
)

export default parentApi
