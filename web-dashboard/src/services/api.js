import axios from 'axios'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const deriveApiBaseUrl = () => {
  const envValue = import.meta.env.VITE_API_BASE_URL
  if (envValue && envValue.trim().length > 0) {
    return envValue.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000'
    }

    const dashboardMarker = '--web-dashboard--'
    const backendMarker = '--backend-api--'
    if (origin.includes(dashboardMarker)) {
      return origin.replace(dashboardMarker, backendMarker)
    }

    return origin.replace(/\/+$/, '')
  }

  return 'http://localhost:3000'
}

const API_BASE_URL = deriveApiBaseUrl()

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    if (error.response) {
      // Server responded with error status
      console.error('[API_ERROR] Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
        message: error.response.data?.message,
        error: error.response.data?.error
      })
    } else if (error.request) {
      // Request was made but no response received
      console.error('[API_ERROR] No response received:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.code === 'ECONNABORTED',
        networkError: error.message === 'Network Error'
      })
    } else {
      // Error setting up request
      console.error('[API_ERROR] Request setup error:', {
        message: error.message,
        error: error
      })
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.location.href = '/register'
    }
    
    // Enhance error object with useful information
    if (error.response?.data) {
      error.backendMessage = error.response.data.message
      error.backendError = error.response.data.error
    }
    
    return Promise.reject(error)
  }
)

export default api

