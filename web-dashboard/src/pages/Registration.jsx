import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  if (error?.error_description) {
    return error.error_description
  }

  if (error?.message) {
    return error.message
  }

  if (error?.data?.msg) {
    return error.data.msg
  }

  return 'Authentication failed. Please try again.'
}

const normalizeEmail = (rawValue) => {
  if (!rawValue) {
    return ''
  }
  return rawValue.trim().toLowerCase()
}

const Registration = () => {
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email])
  const emailIsValid = useMemo(() => EMAIL_REGEX.test(normalizedEmail), [normalizedEmail])

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type })
  }, [])

  const clearStatus = useCallback(() => setStatus(null), [])

  useEffect(() => {
    if (!linkSent || resendTimer === 0) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [linkSent, resendTimer])

  const handleSendMagicLink = useCallback(async () => {
    const requestId = `magic_link_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    if (!emailIsValid) {
      console.warn(`[AUTH_FLOW] [${requestId}] Invalid email format:`, { requestId, email: normalizedEmail })
      showStatus('Enter a valid email address.', 'error')
      return
    }

    setIsLoading(true)
    showStatus('Sending magic link…', 'info')

    try {
      const redirectTo = new URL('/auth/callback', window.location.origin).href
      console.log(`[AUTH_FLOW] [${requestId}] Requesting magic link:`, {
        requestId,
        email: normalizedEmail,
        redirectTo,
        timestamp: new Date().toISOString()
      })
      
      const startTime = Date.now()
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo
        }
      })

      const duration = Date.now() - startTime

      if (error) {
        console.error(`[AUTH_FLOW] [${requestId}] Magic link request failed:`, {
          requestId,
          error: error.message,
          name: error.name,
          status: error.status,
          code: error.code,
          duration: `${duration}ms`
        })
        throw error
      }

      console.log(`[AUTH_FLOW] [${requestId}] Magic link sent successfully:`, {
        requestId,
        email: normalizedEmail,
        redirectTo,
        duration: `${duration}ms`
      })

      setLinkSent(true)
      showStatus(
        `Magic link sent successfully! Check your email at ${normalizedEmail} and click the link to continue.`,
        'success'
      )
      setResendTimer(45)
    } catch (error) {
      console.error(`[AUTH_FLOW] [${requestId}] Magic link request error:`, {
        requestId,
        error: error.message,
        name: error.name,
        status: error.status,
        code: error.code,
        error: error
      })
      if (error?.response) {
        showStatus(resolveErrorMessage(error), 'error')
      } else {
        showStatus(resolveAuthError(error), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [normalizedEmail, emailIsValid, showStatus])

  const handleReset = () => {
    setLinkSent(false)
    setEmail('')
    clearStatus()
    setResendTimer(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-4">
          <span className="app-pill">Cryptopulse</span>
          <p className="text-muted text-sm uppercase tracking-[0.45em]">
            Secure access to your Cryptopulse account
          </p>
          <h1 className="heading-xl">
            {linkSent ? 'Check your email' : 'Register your email'}
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
                We deliver secure magic link authentication via email to keep your trading operations compliant and
                protected.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {!linkSent ? (
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
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && emailIsValid && !isLoading) {
                        handleSendMagicLink()
                      }
                    }}
                  />
                </div>
                <p className="text-sm text-muted">
                  A secure magic link will be sent to this email address. Check your inbox and spam folder.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="app-card-soft p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 border border-success/30 text-success flex-shrink-0">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-base font-semibold text-accent-100">
                        Check your email
                      </p>
                      <p className="text-sm text-muted">
                        We&apos;ve sent a magic link to <strong className="text-accent-200">{normalizedEmail}</strong>
                      </p>
                      <p className="text-sm text-muted">
                        Click the link in the email to sign in. The link will expire in 1 hour.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Didn&apos;t receive the email?</span>
                  <button
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={isLoading || resendTimer > 0}
                    className="inline-flex items-center gap-2 text-accent-200 hover:text-accent-100 disabled:text-muted-500 disabled:cursor-not-allowed transition"
                  >
                    <Loader2
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : resendTimer === 0 ? '' : 'text-muted'}`}
                    />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend link'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-white/10 hover:border-white/20 bg-ocean-800/50 hover:bg-ocean-800/70 text-accent-200 font-medium text-sm transition"
                >
                  Use a different email
                </button>
              </div>
            )}

            {!linkSent && (
              <button
                type="button"
                disabled={isLoading || !emailIsValid}
                onClick={handleSendMagicLink}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-3xl bg-accent-500 hover:bg-accent-400 disabled:bg-accent-500/60 disabled:cursor-not-allowed text-white font-semibold text-base transition shadow-lg shadow-accent-500/20"
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                Send magic link
              </button>
            )}

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
