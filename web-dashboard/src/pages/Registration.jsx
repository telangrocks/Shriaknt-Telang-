import { useCallback, useMemo, useState } from 'react'
import { ShieldCheck, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../services/api'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'
import { useNavigate } from 'react-router-dom'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

const resolveErrorMessage = (error) => {
  if (error?.response) {
    const { status, data } = error.response
    const message = data?.message || data?.error
    if (message) {
      return message
    }
    return `Request failed with status ${status}`
  }

  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your connection and try again.'
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Unable to reach Cryptopulse servers. Please verify your network or API configuration.'
  }

  return error?.message || 'Unexpected error occurred. Please try again.'
}

const resolveAuthError = (error) => {
  if (!error) {
    return 'Unexpected authentication error. Please try again.'
  }

  if (typeof error === 'string') {
    return error
  }

  // Handle Supabase 422 errors with specific messages
  if (error?.status === 422) {
    // Check for user_already_exists error code first
    if (error?.code === 'user_already_exists' || 
        error?.message?.toLowerCase().includes('user_already_exists') ||
        error?.error_description?.toLowerCase().includes('user_already_exists')) {
      return 'This email is already registered. Please sign in instead.'
    }

    if (error?.error_description) {
      // Check error description for common patterns
      const desc = error.error_description.toLowerCase()
      if (desc.includes('already exists') || desc.includes('already registered')) {
        return 'This email is already registered. Please sign in instead.'
      }
      return error.error_description
    }
    if (error?.message) {
      // Map common Supabase error codes to user-friendly messages
      const msg = error.message.toLowerCase()
      if (msg.includes('password')) {
        return 'Password does not meet requirements. Please use at least 8 characters.'
      }
      if (msg.includes('email')) {
        return 'Invalid email address. Please check your email format.'
      }
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return 'This email is already registered. Please sign in instead.'
      }
      return error.message
    }
    if (error?.hint) {
      const hint = error.hint.toLowerCase()
      if (hint.includes('already exists') || hint.includes('already registered')) {
        return 'This email is already registered. Please sign in instead.'
      }
      return error.hint
    }
    return 'Invalid signup data. Please check your email and password.'
  }

  if (error?.error_description) {
    return error.error_description
  }

  if (error?.message) {
    return error.message
  }

  if (error?.data?.msg) {
    return error.data.msg
  }

  if (error?.hint) {
    return error.hint
  }

  return 'Authentication failed. Please try again.'
}

const normalizeEmail = (rawValue) => {
  if (!rawValue) {
    return ''
  }
  return rawValue.trim().toLowerCase()
}

const Registration = ({ setIsAuthenticated }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(true) // Toggle between signup and login
  const navigate = useNavigate()

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email])
  const emailIsValid = useMemo(() => EMAIL_REGEX.test(normalizedEmail), [normalizedEmail])
  const passwordIsValid = useMemo(() => password.length >= MIN_PASSWORD_LENGTH, [password])

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type })
  }, [])

  const clearStatus = useCallback(() => setStatus(null), [])

  const persistAuthSession = useCallback((token, refreshToken) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  }, [])

  const exchangeSession = useCallback(async (session) => {
    if (!session?.access_token) {
      throw new Error('Supabase did not return a valid session.')
    }

    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`[AUTH_FLOW] [${requestId}] Starting session exchange...`, {
      requestId,
      userId: session.user?.id,
      email: session.user?.email
    })

    try {
      const startTime = Date.now()
      // Axios returns response.data on success, throws error on failure
      const response = await api.post('/auth/supabase-login', {
        accessToken: session.access_token
      })

      const duration = Date.now() - startTime
      const apiData = response.data

      if (!apiData?.success || !apiData?.token) {
        console.error(`[AUTH_FLOW] [${requestId}] Invalid API response:`, {
          requestId,
          response: apiData,
          duration: `${duration}ms`
        })
        throw new Error(
          apiData?.message || apiData?.error || 'Session exchange failed - invalid response.'
        )
      }

      console.log(`[AUTH_FLOW] [${requestId}] Success, storing tokens...`, {
        requestId,
        hasToken: !!apiData.token,
        userId: apiData.user?.id,
        isNewUser: apiData.user?.isNewUser,
        duration: `${duration}ms`
      })

      persistAuthSession(apiData.token, apiData?.refreshToken)
      setIsAuthenticated(true)
      
      // Use setTimeout to ensure state updates are processed before navigation
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 100)
    } catch (error) {
      // Log full error details for debugging
      const errorDetails = {
        requestId,
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        responseHeaders: error?.response?.headers,
        requestUrl: error?.config?.url,
        requestMethod: error?.config?.method,
        requestData: error?.config?.data,
        requestHeaders: error?.config?.headers
      }
      
      console.error(`[AUTH_FLOW] [${requestId}] Exception:`, errorDetails)
      
      // Also log the response data separately for easier inspection
      if (error?.response?.data) {
        console.error(`[AUTH_FLOW] [${requestId}] Error response data:`, JSON.stringify(error.response.data, null, 2))
      }
      
      // Extract error message from axios error response
      let errorMessage = error?.message || 'Session exchange failed. Please try again.'
      
      if (error?.response?.data) {
        const data = error.response.data
        errorMessage = data?.message || data?.error || data?.errorMessage || errorMessage
        
        // Log specific error codes for debugging
        if (data?.error || data?.message) {
          console.error(`[AUTH_FLOW] [${requestId}] Backend error:`, {
            error: data.error,
            message: data.message,
            requestId: data.requestId
          })
        }
      }
      
      throw new Error(errorMessage)
    }
  }, [navigate, setIsAuthenticated, persistAuthSession])

  const handleAuth = useCallback(async () => {
    // Prevent duplicate calls
    if (isLoading) {
      console.warn('[AUTH_FLOW] Auth request already in progress, ignoring duplicate call')
      return
    }
    
    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    if (!emailIsValid) {
      console.warn(`[AUTH_FLOW] [${requestId}] Invalid email format:`, { requestId, email: normalizedEmail })
      showStatus('Enter a valid email address.', 'error')
      return
    }

    if (!passwordIsValid) {
      showStatus(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`, 'error')
      return
    }

    setIsLoading(true)
    showStatus(isSignUp ? 'Creating your account…' : 'Signing you in…', 'info')

    try {
      const startTime = Date.now()
      let result

      if (isSignUp) {
        console.log(`[AUTH_FLOW] [${requestId}] Signing up user:`, {
          requestId,
          email: normalizedEmail,
          emailLength: normalizedEmail.length,
          passwordLength: password.length,
          timestamp: new Date().toISOString()
        })

        // Validate inputs before sending to Supabase
        if (!normalizedEmail || normalizedEmail.trim().length === 0) {
          throw new Error('Email is required for signup')
        }
        if (!password || password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
        }

        // Sign up with email and password
        // Remove emailRedirectTo if undefined (Supabase may reject undefined values)
        const signUpOptions = {
          data: {
            email: normalizedEmail
          }
        }

        // Only add emailRedirectTo if we want to set it explicitly
        // Omitting it allows Supabase to use its default behavior
        
        result = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
          options: signUpOptions
        })
        
        // Log the full result for debugging
        console.log(`[AUTH_FLOW] [${requestId}] Signup result:`, {
          requestId,
          hasError: !!result.error,
          error: result.error,
          hasSession: !!result.data?.session,
          hasUser: !!result.data?.user,
          userEmail: result.data?.user?.email,
          userId: result.data?.user?.id
        })
      } else {
        console.log(`[AUTH_FLOW] [${requestId}] Signing in user:`, {
          requestId,
          email: normalizedEmail,
          timestamp: new Date().toISOString()
        })

        // Sign in with email and password
        result = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password
        })
      }

      const duration = Date.now() - startTime

      if (result.error) {
        // Enhanced error logging for Supabase errors
        const errorDetails = {
          requestId,
          message: result.error.message,
          name: result.error.name,
          status: result.error.status,
          code: result.error.code,
          error: result.error.error,
          errorDescription: result.error.error_description,
          errorHint: result.error.hint,
          fullError: result.error,
          duration: `${duration}ms`
        }
        
        console.error(`[AUTH_FLOW] [${requestId}] Authentication failed:`, errorDetails)
        
        // Log Supabase-specific error details
        if (result.error.status === 422) {
          console.error(`[AUTH_FLOW] [${requestId}] Supabase 422 error details:`, {
            requestId,
            errorCode: result.error.code,
            errorMessage: result.error.message,
            errorDescription: result.error.error_description,
            hint: result.error.hint,
            email: normalizedEmail,
            passwordLength: password.length,
            note: '422 usually means invalid request data - check email format, password requirements, or missing fields'
          })
        }
        
        // Handle "user already exists" error during signup
        // Check both error code and message/hint for user_already_exists
        const isUserAlreadyExists = 
          result.error.code === 'user_already_exists' ||
          result.error.message?.toLowerCase().includes('user_already_exists') ||
          result.error.error_description?.toLowerCase().includes('already exists') ||
          result.error.message?.toLowerCase().includes('already exists') ||
          result.error.hint?.toLowerCase().includes('already exists') ||
          (result.error.status === 422 && (
            result.error.message?.toLowerCase().includes('already registered') ||
            result.error.error_description?.toLowerCase().includes('already registered')
          ))

        if (isSignUp && isUserAlreadyExists) {
          console.log(`[AUTH_FLOW] [${requestId}] User already exists (code: ${result.error.code}), switching to sign in mode...`, {
            requestId,
            errorCode: result.error.code,
            errorMessage: result.error.message,
            errorDescription: result.error.error_description
          })
          setIsSignUp(false)
          showStatus('This account already exists. Please sign in with your password.', 'info')
          
          // Automatically try to sign in with the provided credentials
          try {
            const signInResult = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: password
            })
            
            if (signInResult.error) {
              throw signInResult.error
            }
            
            if (signInResult.data?.session) {
              console.log(`[AUTH_FLOW] [${requestId}] Auto sign-in successful after user_already_exists`)
              showStatus('Signing you in…', 'info')
              await exchangeSession(signInResult.data.session)
              showStatus('Sign in successful! Redirecting…', 'success')
              return
            }
          } catch (signInError) {
            console.error(`[AUTH_FLOW] [${requestId}] Auto sign-in failed:`, {
              requestId,
              error: signInError.message,
              code: signInError.code
            })
            // Fall through to show error message below
            throw new Error('This account already exists. Please sign in with your password.')
          }
        }
        
        throw result.error
      }

      // Handle case where signup succeeds but no session is returned (email confirmation might be enabled)
      if (!result.data?.session) {
        if (isSignUp) {
          console.warn(`[AUTH_FLOW] [${requestId}] Signup succeeded but no session returned. Attempting sign in...`)
          // Try to sign in immediately - user was just created
          try {
            const signInResult = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: password
            })
            
            if (signInResult.error) {
              console.error(`[AUTH_FLOW] [${requestId}] Sign-in after signup failed:`, signInResult.error)
              throw new Error('Account may have been created, but email confirmation might be enabled in Supabase. Please disable email confirmation in Supabase Dashboard → Authentication → Settings.')
            }
            
            if (signInResult.data?.session) {
              console.log(`[AUTH_FLOW] [${requestId}] Sign-in after signup successful`)
              result.data.session = signInResult.data.session
            } else {
              throw new Error('Account created, but please check your Supabase settings to ensure email confirmation is disabled for instant authentication.')
            }
          } catch (signInError) {
            console.error(`[AUTH_FLOW] [${requestId}] Error during post-signup sign-in:`, signInError)
            throw signInError
          }
        } else {
          throw new Error('Authentication succeeded but no session was returned.')
        }
      }

      console.log(`[AUTH_FLOW] [${requestId}] Authentication successful:`, {
        requestId,
        userId: result.data.session.user?.id,
        email: result.data.session.user?.email,
        duration: `${duration}ms`
      })

      // Exchange Supabase session for application tokens
      showStatus('Finalizing authentication…', 'info')
      await exchangeSession(result.data.session)

      showStatus(
        isSignUp ? 'Account created successfully! Redirecting…' : 'Sign in successful! Redirecting…',
        'success'
      )
    } catch (error) {
      console.error(`[AUTH_FLOW] [${requestId}] Authentication error:`, {
        requestId,
        error: error.message,
        name: error.name,
        status: error.status,
        code: error.code,
        error: error
      })
      
      // Handle specific error cases with user-friendly messages
      let errorMessage = resolveAuthError(error)
      
      // Check for axios/backend error responses first
      if (error?.response) {
        const backendMessage = error.response.data?.message || error.response.data?.error
        if (backendMessage) {
          errorMessage = backendMessage
        } else if (error.response.status === 500) {
          errorMessage = 'Server error occurred. Please try again. If the problem persists, contact support.'
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please check your credentials and try again.'
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid request. Please check your input.'
        }
      } else if (error?.code === 'user_already_exists') {
        errorMessage = 'This account already exists. Please sign in instead.'
        // Switch to sign in mode if not already
        if (isSignUp) {
          setIsSignUp(false)
        }
      } else if (error?.code === 'invalid_credentials' || error?.message?.toLowerCase().includes('invalid login')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error?.code === 'email_not_confirmed') {
        errorMessage = 'Please check your Supabase settings and disable email confirmation for instant authentication.'
      } else if (error?.status === 422) {
        errorMessage = error.message || 'Invalid request. Please check your input and try again.'
      }
      
      showStatus(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [normalizedEmail, emailIsValid, password, passwordIsValid, isSignUp, showStatus, exchangeSession])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-4">
          <span className="app-pill">Cryptopulse</span>
          <p className="text-muted text-sm uppercase tracking-[0.45em]">
            Secure access to your Cryptopulse account
          </p>
          <h1 className="heading-xl">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h1>
          <p className="text-base text-muted">
            Multi-factor security powered by Cryptopulse AI keeps your trading operations safe and
            compliant.
          </p>
        </div>

        <div className="app-card p-10 space-y-8">
          <div className="app-card-soft p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-3xl bg-accent-500/15 border border-accent-400/30 text-accent-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1 text-sm text-muted">
              <p className="text-base font-medium text-accent-100">
                Multi-factor security powered by Cryptopulse AI
              </p>
              <p>
                Secure authentication keeps your trading operations compliant and protected.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted uppercase tracking-wide" htmlFor="email">
                Email address
              </label>
              <div
                className={`flex items-center gap-3 px-5 py-4 rounded-3xl border ${
                  emailIsValid ? 'border-accent-400/60 shadow-glow' : 'border-white/8'
                } bg-ocean-800/70 focus-within:border-accent-400/80 focus-within:shadow-glow transition`}
              >
                <Mail className="h-5 w-5 text-accent-300" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your.email@example.com"
                  className="w-full bg-transparent outline-none text-accent-100 placeholder:text-muted-500 text-base"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    clearStatus()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && emailIsValid && passwordIsValid && !isLoading) {
                      handleAuth()
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-muted uppercase tracking-wide" htmlFor="password">
                Password
              </label>
              <div
                className={`flex items-center gap-3 px-5 py-4 rounded-3xl border ${
                  passwordIsValid ? 'border-accent-400/60 shadow-glow' : 'border-white/8'
                } bg-ocean-800/70 focus-within:border-accent-400/80 focus-within:shadow-glow transition`}
              >
                <Lock className="h-5 w-5 text-accent-300" />
                <input
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder={isSignUp ? 'Create a password (min. 8 characters)' : 'Enter your password'}
                  className="w-full bg-transparent outline-none text-accent-100 placeholder:text-muted-500 text-base"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    clearStatus()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && emailIsValid && passwordIsValid && !isLoading) {
                      handleAuth()
                    }
                  }}
                />
              </div>
              {isSignUp && (
                <p className="text-sm text-muted">
                  Password must be at least {MIN_PASSWORD_LENGTH} characters long.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={isLoading || !emailIsValid || !passwordIsValid}
              onClick={handleAuth}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-3xl bg-accent-500 hover:bg-accent-400 disabled:bg-accent-500/60 disabled:cursor-not-allowed text-white font-semibold text-base transition shadow-lg shadow-accent-500/20"
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  clearStatus()
                  setPassword('')
                }}
                className="text-sm text-accent-200 hover:text-accent-100 transition"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>

            {status && (
              <div
                className={`app-card-soft border ${
                  status.type === 'error'
                    ? 'border-danger/50 bg-danger/10 text-danger'
                    : status.type === 'success'
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-accent-400/40 bg-accent-500/10 text-accent-200'
                } flex items-start gap-3 px-5 py-4`}
              >
                <CheckCircle2 className="h-5 w-5 mt-0.5" />
                <p className="text-sm leading-relaxed">{status.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Registration
