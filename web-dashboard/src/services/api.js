import axios from 'axios'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

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
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      window.location.href = '/register'
    }
    return Promise.reject(error)
  }
)

export default api

