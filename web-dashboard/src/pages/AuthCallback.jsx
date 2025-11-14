import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../services/api'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const AuthCallback = ({ setIsAuthenticated }) => {
  const [message, setMessage] = useState('Verifying secure magic link…')
  const [isError, setIsError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const persistAuthSession = (token, refreshToken) => {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
      }
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }
    }

    const exchangeSession = async (session, sessionId) => {
      const exchangeId = sessionId || `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      if (!session?.access_token) {
        console.error(`[SESSION_EXCHANGE] [${exchangeId}] Invalid session:`, {
          exchangeId,
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          sessionKeys: session ? Object.keys(session) : []
        })
        throw new Error('Supabase did not return a valid session.')
      }

      console.log(`[SESSION_EXCHANGE] [${exchangeId}] Starting session exchange...`, {
        exchangeId,
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token,
        userId: session.user?.id,
        email: session.user?.email,
        tokenLength: session.access_token.length
      })

      setMessage('Exchanging Supabase session with Cryptopulse…')
      
      try {
        const startTime = Date.now()
        console.log(`[SESSION_EXCHANGE] [${exchangeId}] Calling backend /auth/supabase-login...`)
        
        const { data: apiData, error: apiError } = await api.post('/auth/supabase-login', {
          accessToken: session.access_token
        })

        const duration = Date.now() - startTime

        if (apiError) {
          // Comprehensive error extraction
          const errorDetails = {
            exchangeId,
            message: apiError?.message,
            name: apiError?.name,
            code: apiError?.code,
            status: apiError?.response?.status,
            statusText: apiError?.response?.statusText,
            statusCode: apiError?.response?.status,
            response: apiError?.response ? {
              status: apiError.response.status,
              statusText: apiError.response.statusText,
              data: apiError.response.data,
              headers: apiError.response.headers
            } : undefined,
            request: apiError?.request ? {
              method: apiError.request.method,
              url: apiError.request.url
            } : undefined,
            data: apiError?.response?.data,
            backendMessage: apiError?.response?.data?.message,
            backendError: apiError?.response?.data?.error,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            allKeys: Object.keys(apiError || {})
          }
          
          console.error(`[SESSION_EXCHANGE] [${exchangeId}] API error - Full details:`, errorDetails)
          console.error(`[SESSION_EXCHANGE] [${exchangeId}] Error object keys:`, errorDetails.allKeys)
          
          // Log backend response if available
          if (apiError?.response?.data) {
            console.error(`[SESSION_EXCHANGE] [${exchangeId}] Backend error response:`, {
              status: apiError.response.status,
              data: apiError.response.data,
              message: apiError.response.data?.message,
              error: apiError.response.data?.error
            })
          }
          
          // Create error with priority-based message
          const errorMessage = 
            apiError?.response?.data?.message || 
            apiError?.response?.data?.error || 
            apiError?.message || 
            `Session exchange failed (${apiError?.response?.status || 'unknown status'})`
          
          const enhancedError = new Error(errorMessage)
          enhancedError.originalError = apiError
          enhancedError.status = apiError?.response?.status
          enhancedError.responseData = apiError?.response?.data
          throw enhancedError
        }

        if (!apiData?.success || !apiData?.token) {
          console.error(`[SESSION_EXCHANGE] [${exchangeId}] Invalid API response:`, {
            exchangeId,
            success: apiData?.success,
            hasToken: !!apiData?.token,
            message: apiData?.message,
            error: apiData?.error,
            apiData: apiData,
            duration: `${duration}ms`
          })
          throw new Error(
            apiData?.message || apiData?.error || 'Session exchange failed - invalid response.'
          )
        }

        console.log(`[SESSION_EXCHANGE] [${exchangeId}] Success, storing tokens...`, {
          exchangeId,
          hasToken: !!apiData.token,
          hasRefreshToken: !!apiData.refreshToken,
          userId: apiData.user?.id,
          isNewUser: apiData.user?.isNewUser,
          duration: `${duration}ms`
        })
        persistAuthSession(apiData.token, apiData?.refreshToken)
        setIsAuthenticated(true)
        setMessage('Authentication successful. Redirecting to your dashboard…')
        window.location.hash = ''
        setTimeout(() => navigate('/', { replace: true }), 1200)
      } catch (error) {
        console.error(`[SESSION_EXCHANGE] [${exchangeId}] Exception:`, {
          exchangeId,
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          error: error
        })
        throw error
      }
    }

    const hydrateSessionFromUrl = async () => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      try {
        // Log current URL state for debugging
        console.log(`[MAGIC_LINK] [${sessionId}] AuthCallback - Current URL:`, {
          sessionId,
          href: window.location.href,
          hash: window.location.hash,
          pathname: window.location.pathname,
          search: window.location.search,
          timestamp: new Date().toISOString()
        })

        // First, check if there are tokens in the URL hash
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const errorParam = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Check for error in URL first
        if (errorParam) {
          const errorMsg = errorDescription || errorParam
          console.error(`[MAGIC_LINK] [${sessionId}] Magic link error in URL:`, {
            sessionId,
            error: errorParam,
            error_description: errorDescription,
            fullHash: hash
          })
          throw new Error(`Magic link error: ${errorMsg}`)
        }

        // If we have tokens in the URL, set the session explicitly
        if (accessToken && refreshToken) {
          console.log(`[MAGIC_LINK] [${sessionId}] Magic link tokens found in URL hash:`, {
            sessionId,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type: type,
            tokenLength: accessToken.length
          })

          setMessage('Processing magic link tokens…')
          console.log(`[MAGIC_LINK] [${sessionId}] Setting Supabase session...`)
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error(`[MAGIC_LINK] [${sessionId}] setSession error:`, {
              sessionId,
              message: error.message,
              status: error.status,
              name: error.name,
              code: error.code,
              error: error
            })
            throw error
          }

          if (data?.session) {
            console.log(`[MAGIC_LINK] [${sessionId}] Session established successfully`, {
              sessionId,
              userId: data.session.user?.id,
              email: data.session.user?.email
            })
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
            await exchangeSession(data.session, sessionId)
            return
          } else {
            throw new Error('setSession succeeded but no session was returned')
          }
        }

        // Fallback: try to get existing session
        console.log(`[MAGIC_LINK] [${sessionId}] No tokens in URL hash, checking for existing session...`)
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error(`[MAGIC_LINK] [${sessionId}] getSession error:`, {
            sessionId,
            message: error.message,
            status: error.status,
            name: error.name,
            code: error.code,
            error: error
          })
          throw error
        }
        if (data?.session) {
          console.log(`[MAGIC_LINK] [${sessionId}] Existing session found`, {
            sessionId,
            userId: data.session.user?.id,
            email: data.session.user?.email
          })
          await exchangeSession(data.session, sessionId)
        } else {
          console.log(`[MAGIC_LINK] [${sessionId}] No session found, waiting for auth state change...`)
          setMessage('Waiting for Supabase to finalize the magic link…')
        }
      } catch (error) {
        // Comprehensive error extraction and logging
        const extractErrorDetails = (err) => {
          if (!err) return {}
          
          const details = {
            // Basic error properties
            message: err?.message,
            name: err?.name,
            code: err?.code,
            status: err?.status,
            statusCode: err?.statusCode,
            stack: err?.stack,
            
            // Axios-specific properties
            response: err?.response ? {
              status: err.response.status,
              statusText: err.response.statusText,
              data: err.response.data,
              headers: err.response.headers
            } : undefined,
            
            // Request info (for axios errors)
            request: err?.request ? {
              method: err.request.method,
              url: err.request.url,
              headers: err.request.headers
            } : undefined,
            
            // Supabase-specific properties
            error_description: err?.error_description,
            error_code: err?.error_code,
            
            // Generic error object
            error: err,
            
            // All enumerable properties
            allKeys: Object.keys(err || {}),
            allProperties: {}
          }
          
          // Try to extract all properties
          try {
            for (const key in err) {
              if (err.hasOwnProperty(key)) {
                try {
                  details.allProperties[key] = typeof err[key] === 'object' 
                    ? JSON.stringify(err[key]) 
                    : err[key]
                } catch (e) {
                  details.allProperties[key] = '[Unable to serialize]'
                }
              }
            }
          } catch (e) {
            details.propertyExtractionError = e.message
          }
          
          return details
        }
        
        const errorDetails = {
          sessionId,
          ...extractErrorDetails(error),
          url: window.location.href,
          hash: window.location.hash,
          timestamp: new Date().toISOString()
        }
        
        // Comprehensive logging
        console.error(`[MAGIC_LINK] [${sessionId}] Magic link verification error - Full details:`, errorDetails)
        console.error(`[MAGIC_LINK] [${sessionId}] Error object keys:`, errorDetails.allKeys || [])
        console.error(`[MAGIC_LINK] [${sessionId}] Error object properties:`, errorDetails.allProperties || {})
        
        // Log response data if available (from axios)
        if (error?.response?.data) {
          console.error(`[MAGIC_LINK] [${sessionId}] Backend error response:`, {
            status: error.response.status,
            data: error.response.data,
            message: error.response.data?.message,
            error: error.response.data?.error
          })
        }
        
        setIsError(true)
        
        // Provide helpful error message with priority order
        let userMessage = 'Magic link verification failed.'
        
        // Priority 1: Backend error message (most helpful)
        if (error?.response?.data?.message) {
          userMessage = error.response.data.message
        } else if (error?.response?.data?.error) {
          userMessage = error.response.data.error
        }
        // Priority 2: Axios error message
        else if (error?.message) {
          userMessage = error.message
        }
        // Priority 3: Supabase error description
        else if (error?.error_description) {
          userMessage = error.error_description
        }
        // Priority 4: Status-based message
        else if (error?.response?.status) {
          if (error.response.status === 500) {
            userMessage = 'Server error occurred. Please try again or contact support.'
          } else if (error.response.status === 401) {
            userMessage = 'Authentication failed. Please request a new magic link.'
          } else if (error.response.status === 400) {
            userMessage = 'Invalid request. Please try again.'
          }
        }
        // Priority 5: String error
        else if (typeof error === 'string') {
          userMessage = error
        }
        
        setMessage(userMessage)
      }
    }

    hydrateSessionFromUrl()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log(`[AUTH_FLOW] [${eventId}] Auth state change:`, {
        eventId,
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      })
      
      if (event === 'SIGNED_IN' && session) {
        try {
          console.log(`[AUTH_FLOW] [${eventId}] SIGNED_IN event received, exchanging session...`)
          // Clear hash from URL if present
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname)
          }
          await exchangeSession(session, eventId)
        } catch (error) {
          // Enhanced error logging with comprehensive extraction
          const extractErrorDetails = (err) => {
            if (!err) return {}
            return {
              message: err?.message,
              name: err?.name,
              code: err?.code,
              status: err?.status,
              statusCode: err?.statusCode,
              stack: err?.stack,
              response: err?.response ? {
                status: err.response.status,
                data: err.response.data
              } : undefined,
              originalError: err?.originalError,
              responseData: err?.responseData,
              allKeys: Object.keys(err || {}),
              error: err
            }
          }
          
          const errorDetails = {
            eventId,
            ...extractErrorDetails(error),
            timestamp: new Date().toISOString()
          }
          
          console.error(`[AUTH_FLOW] [${eventId}] Auth state exchange error - Full details:`, errorDetails)
          console.error(`[AUTH_FLOW] [${eventId}] Error object keys:`, errorDetails.allKeys || [])
          
          if (error?.response?.data) {
            console.error(`[AUTH_FLOW] [${eventId}] Backend error response:`, {
              status: error.response.status,
              data: error.response.data
            })
          }
          
          setIsError(true)
          
          // Priority-based error message
          const userMessage = 
            error?.responseData?.message ||
            error?.response?.data?.message ||
            error?.responseData?.error ||
            error?.response?.data?.error ||
            error?.message ||
            error?.error_description ||
            'Magic link verification failed.'
          
          setMessage(userMessage)
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log(`[AUTH_FLOW] [${eventId}] Token refreshed successfully`)
      } else if (event === 'SIGNED_OUT') {
        console.log(`[AUTH_FLOW] [${eventId}] User signed out`)
      } else if (event === 'USER_UPDATED') {
        console.log(`[AUTH_FLOW] [${eventId}] User updated`)
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log(`[AUTH_FLOW] [${eventId}] Password recovery initiated`)
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [navigate, setIsAuthenticated])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-6 text-center">
        <div className="flex items-center justify-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-3xl border ${
              isError
                ? 'border-danger/60 bg-danger/10 text-danger'
                : 'border-accent-400/60 bg-accent-500/10 text-accent-300'
            }`}
          >
            {isError ? (
              <ShieldCheck className="h-8 w-8" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin" />
            )}
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="heading-xl">{isError ? 'Verification failed' : 'Verifying link…'}</h1>
          <p className="text-base text-muted">{message}</p>
          {isError && (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                Please request a new magic link or try copying the link into this browser manually.
              </p>
              <button
                type="button"
                onClick={() => navigate('/register', { replace: true })}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/10 hover:border-white/30 bg-ocean-900/40 text-accent-200 font-medium text-sm transition"
              >
                Return to registration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthCallback

