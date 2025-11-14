import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Dashboard from './pages/Dashboard'
import Registration from './pages/Registration'
import Splash from './pages/Splash'
import './App.css'
import { AUTH_TOKEN_KEY } from './constants/auth'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(true)

  // Check authentication status
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    setIsAuthenticated(!!token)
    return !!token
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
    setIsAuthenticated(value)
    // Also verify localStorage is in sync
    if (value) {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) {
        console.warn('[AUTH] setIsAuthenticated(true) called but no token in localStorage')
      }
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
            isAuthenticated ? (
              <Dashboard setIsAuthenticated={handleSetIsAuthenticated} />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
      </Routes>
    </Router>
  )
}

export default App

