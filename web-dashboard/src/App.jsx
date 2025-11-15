import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Dashboard from './pages/Dashboard'
import Registration from './pages/Registration'
import Splash from './pages/Splash'
import './App.css'
import { AUTH_TOKEN_KEY } from './constants/auth'

// Protected Route Component
const ProtectedRoute = ({ isAuthenticated, setIsAuthenticated }) => {
  // Double-check authentication before rendering
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const isAuth = !!token || isAuthenticated
  
  console.log('[APP] ProtectedRoute check:', {
    isAuthenticated,
    hasToken: !!token,
    finalAuth: isAuth
  })
  
  if (isAuth) {
    return <Dashboard setIsAuthenticated={setIsAuthenticated} />
  } else {
    return <Navigate to="/register" replace />
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(true)

  // Check authentication status
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const isAuth = !!token
    console.log('[APP] Authentication check:', {
      hasToken: !!token,
      isAuthenticated: isAuth,
      tokenLength: token?.length
    })
    setIsAuthenticated(isAuth)
    return isAuth
  }, [])

  useEffect(() => {
    checkAuth()
    setBootstrapping(false)

    const timer = window.setTimeout(() => {
      setShowSplash(false)
    }, 1500)

    // Listen for storage changes (cross-tab)
    const handleStorage = (event) => {
      if (event.key === AUTH_TOKEN_KEY) {
        setIsAuthenticated(!!event.newValue)
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('storage', handleStorage)
    }
  }, [checkAuth])

  // Enhanced setIsAuthenticated that also checks localStorage
  const handleSetIsAuthenticated = useCallback((value) => {
    console.log('[APP] Setting authentication state:', {
      value,
      hasToken: !!localStorage.getItem(AUTH_TOKEN_KEY)
    })
    setIsAuthenticated(value)
    // Also verify localStorage is in sync
    if (value) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        console.warn('[APP] ⚠️ setIsAuthenticated(true) called but no token in localStorage')
      } else {
        console.log('[APP] ✅ Authentication state updated, token present')
      }
    } else {
      // If setting to false, clear localStorage
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      console.log('[APP] Authentication cleared')
    }
  }, [])

  if (showSplash || bootstrapping) {
    return <Splash />
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Navigate to="/register" replace />} />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Registration setIsAuthenticated={handleSetIsAuthenticated} />
            )
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute 
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={handleSetIsAuthenticated}
            />
          }
        />
      </Routes>
    </Router>
  )
}

export default App

