const PMS_BASE_URL = process.env.PMS_API_BASE_URL || 'https://api.apnipathshala.org/api'
const PMS_API_TOKEN = process.env.PMS_API_TOKEN
const PMS_API_EMAIL = process.env.PMS_API_EMAIL
const PMS_API_PASSWORD = process.env.PMS_API_PASSWORD

const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000

let cachedToken = null
let cachedTokenExpiresAt = 0

function requirePmsConfig() {
  if (!PMS_BASE_URL || (!PMS_API_TOKEN && (!PMS_API_EMAIL || !PMS_API_PASSWORD))) {
    const error = new Error('PMS API credentials are not configured')
    error.statusCode = 500
    throw error
  }

  return {
    baseUrl: PMS_BASE_URL.replace(/\/$/, ''),
    token: PMS_API_TOKEN,
    email: PMS_API_EMAIL,
    password: PMS_API_PASSWORD
  }
}

async function loginForToken(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const message = await response.text()
    const error = new Error(`Failed to fetch PMS auth token: ${message || response.statusText}`)
    error.statusCode = response.status
    throw error
  }

  const payload = await response.json()
  if (!payload?.token) {
    const error = new Error('PMS auth token missing in response')
    error.statusCode = 500
    throw error
  }

  cachedToken = payload.token
  cachedTokenExpiresAt = Date.now() + TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS
  return cachedToken
}

async function getPmsToken() {
  const { baseUrl, token, email, password } = requirePmsConfig()
  if (token) {
    return token
  }

  if (cachedToken && cachedTokenExpiresAt > Date.now()) {
    return cachedToken
  }

  return loginForToken(baseUrl, email, password)
}

async function fetchPmsPods() {
  const { baseUrl } = requirePmsConfig()
  const token = await getPmsToken()
  const response = await fetch(`${baseUrl}/pods`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const message = await response.text()
    const error = new Error(`Failed to fetch PMS pods: ${message || response.statusText}`)
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

module.exports = {
  fetchPmsPods
}
