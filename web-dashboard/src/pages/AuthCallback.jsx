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
        throw new Error('Supabase did not return a valid session.')
      }

      setMessage('Exchanging Supabase session with Cryptopulse…')
      const { data: apiData, error: apiError } = await api.post('/auth/supabase-login', {
        accessToken: session.access_token
      })

      if (apiError || !apiData?.success || !apiData?.token) {
        throw new Error(
          apiData?.message || apiData?.error || apiError?.message || 'Session exchange failed.'
        )
      }

      persistAuthSession(apiData.token, apiData?.refreshToken)
      setIsAuthenticated(true)
      setMessage('Authentication successful. Redirecting to your dashboard…')
      window.location.hash = ''
      setTimeout(() => navigate('/', { replace: true }), 1200)
    }

    const hydrateSessionFromUrl = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }
        if (data?.session) {
          await exchangeSession(data.session)
        } else {
          setMessage('Waiting for Supabase to finalize the magic link…')
        }
      } catch (error) {
        console.error('Magic link verification error:', error)
        setIsError(true)
        setMessage(error.message || 'Magic link verification failed.')
      }
    }

    hydrateSessionFromUrl()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          await exchangeSession(session)
        } catch (error) {
          console.error('Auth state exchange error:', error)
          setIsError(true)
          setMessage(error.message || 'Magic link verification failed.')
        }
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

