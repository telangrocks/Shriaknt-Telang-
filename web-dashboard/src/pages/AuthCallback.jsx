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

    const exchangeSession = async (session) => {
      if (!session?.access_token) {
        console.error('exchangeSession - Invalid session:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          sessionKeys: session ? Object.keys(session) : []
        })
        throw new Error('Supabase did not return a valid session.')
      }

      console.log('exchangeSession - Starting session exchange...', {
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token,
        userId: session.user?.id,
        email: session.user?.email
      })

      setMessage('Exchanging Supabase session with Cryptopulse…')
      
      try {
        const { data: apiData, error: apiError } = await api.post('/auth/supabase-login', {
          accessToken: session.access_token
        })

        if (apiError) {
          console.error('exchangeSession - API error:', {
            message: apiError?.message,
            response: apiError?.response,
            status: apiError?.response?.status,
            data: apiError?.response?.data
          })
          throw new Error(
            apiError?.response?.data?.message || 
            apiError?.response?.data?.error || 
            apiError?.message || 
            'Session exchange failed.'
          )
        }

        if (!apiData?.success || !apiData?.token) {
          console.error('exchangeSession - Invalid API response:', {
            success: apiData?.success,
            hasToken: !!apiData?.token,
            message: apiData?.message,
            error: apiData?.error,
            apiData: apiData
          })
          throw new Error(
            apiData?.message || apiData?.error || 'Session exchange failed - invalid response.'
          )
        }

        console.log('exchangeSession - Success, storing tokens...')
        persistAuthSession(apiData.token, apiData?.refreshToken)
        setIsAuthenticated(true)
        setMessage('Authentication successful. Redirecting to your dashboard…')
        window.location.hash = ''
        setTimeout(() => navigate('/', { replace: true }), 1200)
      } catch (error) {
        console.error('exchangeSession - Exception:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          error: error
        })
        throw error
      }
    }

    const hydrateSessionFromUrl = async () => {
      try {
        // Log current URL state for debugging
        console.log('AuthCallback - Current URL:', {
          href: window.location.href,
          hash: window.location.hash,
          pathname: window.location.pathname,
          search: window.location.search
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
          console.error('Magic link error in URL:', {
            error: errorParam,
            error_description: errorDescription,
            fullHash: hash
          })
          throw new Error(`Magic link error: ${errorMsg}`)
        }

        // If we have tokens in the URL, set the session explicitly
        if (accessToken && refreshToken) {
          console.log('Magic link tokens found in URL hash:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type: type,
            tokenLength: accessToken.length
          })

          setMessage('Processing magic link tokens…')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('setSession error:', {
              message: error.message,
              status: error.status,
              name: error.name,
              code: error.code,
              error: error
            })
            throw error
          }

          if (data?.session) {
            console.log('Session established successfully')
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
            await exchangeSession(data.session)
            return
          } else {
            throw new Error('setSession succeeded but no session was returned')
          }
        }

        // Fallback: try to get existing session
        console.log('No tokens in URL hash, checking for existing session...')
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('getSession error:', {
            message: error.message,
            status: error.status,
            name: error.name,
            code: error.code,
            error: error
          })
          throw error
        }
        if (data?.session) {
          console.log('Existing session found')
          await exchangeSession(data.session)
        } else {
          console.log('No session found, waiting for auth state change...')
          setMessage('Waiting for Supabase to finalize the magic link…')
        }
      } catch (error) {
        // Enhanced error logging
        const errorDetails = {
          message: error?.message,
          name: error?.name,
          code: error?.code,
          status: error?.status,
          statusCode: error?.statusCode,
          stack: error?.stack,
          error: error,
          url: window.location.href,
          hash: window.location.hash
        }
        console.error('Magic link verification error - Full details:', errorDetails)
        console.error('Error object keys:', Object.keys(error || {}))
        
        setIsError(true)
        // Provide more helpful error message
        let userMessage = 'Magic link verification failed.'
        if (error?.message) {
          userMessage = error.message
        } else if (error?.error_description) {
          userMessage = error.error_description
        } else if (typeof error === 'string') {
          userMessage = error
        }
        setMessage(userMessage)
      }
    }

    hydrateSessionFromUrl()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, hasSession: !!session })
      
      if (event === 'SIGNED_IN' && session) {
        try {
          console.log('SIGNED_IN event received, exchanging session...')
          // Clear hash from URL if present
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname)
          }
          await exchangeSession(session)
        } catch (error) {
          // Enhanced error logging
          const errorDetails = {
            message: error?.message,
            name: error?.name,
            code: error?.code,
            status: error?.status,
            stack: error?.stack,
            error: error
          }
          console.error('Auth state exchange error - Full details:', errorDetails)
          setIsError(true)
          setMessage(error?.message || error?.error_description || 'Magic link verification failed.')
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
      } else if (event === 'USER_UPDATED') {
        console.log('User updated')
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery initiated')
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

