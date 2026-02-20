import api from './api'

export const universalSearch = (query, limit = 5) =>
  api.get('/search', { params: { query, limit } })
