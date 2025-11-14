import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Registration from './pages/Registration'
import Splash from './pages/Splash'
import './App.css'
import { AUTH_TOKEN_KEY } from './constants/auth'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    setIsAuthenticated(!!token)
    setBootstrapping(false)

    const timer = window.setTimeout(() => {
      setShowSplash(false)
    }, 1500)

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
              <Registration setIsAuthenticated={setIsAuthenticated} />
            )
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Dashboard setIsAuthenticated={setIsAuthenticated} />
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

