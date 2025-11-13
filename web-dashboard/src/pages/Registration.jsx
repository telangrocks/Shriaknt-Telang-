import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Loader2,
  Phone,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  RotateCcw
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { api } from '../services/api'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const PHONE_REGEX = /^\+\d{8,15}$/
const OTP_REGEX = /^\d{4,8}$/
const STEPS = {
  PHONE: 'phone',
  VERIFY: 'verify'
}

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

const normalizePhoneNumber = (rawValue) => {
  if (!rawValue) {
    return ''
  }

  const trimmed = rawValue.replace(/\s+/g, '')
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/[^\d]/g, '')}`
  }

  if (trimmed.startsWith('00')) {
    return `+${trimmed.slice(2).replace(/[^\d]/g, '')}`
  }

  return `+${trimmed.replace(/[^\d]/g, '')}`
}

const Registration = ({ setIsAuthenticated }) => {
  const [step, setStep] = useState(STEPS.PHONE)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const normalizedPhone = useMemo(() => normalizePhoneNumber(phone), [phone])
  const phoneIsValid = useMemo(() => PHONE_REGEX.test(normalizedPhone), [normalizedPhone])
  const otpIsValid = useMemo(() => OTP_REGEX.test(otp.trim()), [otp])

  useEffect(() => {
    if (step === STEPS.VERIFY && resendTimer > 0) {
      const interval = window.setInterval(
        () => setResendTimer((prev) => (prev > 0 ? prev - 1 : 0)),
        1000
      )
      return () => window.clearInterval(interval)
    }
    return undefined
  }, [resendTimer, step])

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

  const handleSendOtp = useCallback(async () => {
    if (!phoneIsValid) {
      showStatus('Enter a valid phone number with the country code prefix.', 'error')
      return
    }

    setIsLoading(true)
    showStatus('Requesting a secure OTP…', 'info')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { channel: 'sms' }
      })

      if (error) {
        throw error
      }

      showStatus('OTP sent successfully. Enter the code to continue.', 'success')
      setStep(STEPS.VERIFY)
      setResendTimer(45)
    } catch (error) {
      console.error('OTP request error:', error)
      if (error?.response) {
        showStatus(resolveErrorMessage(error), 'error')
      } else {
        showStatus(resolveAuthError(error), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [normalizedPhone, phoneIsValid, showStatus])

  const handleOtpVerification = useCallback(async () => {
    if (!otpIsValid) {
      showStatus('Enter the verification code sent to your phone.', 'error')
      return
    }

    setIsLoading(true)
    showStatus('Verifying your code…', 'info')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp.trim(),
        type: 'sms'
      })

      if (error) {
        throw error
      }

      const session = data?.session

      if (!session?.access_token) {
        throw new Error('Verification failed: no session returned.')
      }

      const { data: apiData, error: apiError } = await api.post('/auth/supabase-login', {
        accessToken: session.access_token
      })

      if (apiError) {
        throw apiError
      }

      if (apiData?.success && apiData?.token) {
        persistAuthSession(apiData.token, apiData?.refreshToken)
        showStatus(
          apiData?.message || 'Phone verified. Redirecting you to the dashboard…',
          'success'
        )
        setIsAuthenticated(true)
        setOtp('')
      } else {
        throw new Error(
          apiData?.message || apiData?.error || 'Session exchange failed. Please try again.'
        )
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      if (error?.response) {
        showStatus(resolveErrorMessage(error), 'error')
      } else {
        showStatus(resolveAuthError(error), 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }, [normalizedPhone, otp, otpIsValid, persistAuthSession, setIsAuthenticated, showStatus])

  const handleBackToPhone = () => {
    setStep(STEPS.PHONE)
    setOtp('')
    clearStatus()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-4">
          <span className="app-pill">Cryptopulse</span>
          <p className="text-muted text-sm uppercase tracking-[0.45em]">
            Step {step === STEPS.PHONE ? '1' : '2'} of 2 · Secure access to your Cryptopulse account
          </p>
          <h1 className="heading-xl">Register your phone</h1>
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
                We deliver OTP verification instantly to keep your trading operations compliant and
                protected.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {step === STEPS.PHONE ? (
              <div className="space-y-4">
                <label className="text-sm font-medium text-muted uppercase tracking-wide" htmlFor="phone">
                  Phone number
                </label>
                <div
                  className={`flex items-center gap-3 px-5 py-4 rounded-3xl border ${
                    phoneIsValid ? 'border-accent-400/60 shadow-glow' : 'border-white/8'
                  } bg-ocean-800/70 focus-within:border-accent-400/80 focus-within:shadow-glow transition`}
                >
                  <Phone className="h-5 w-5 text-accent-300" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+1 555 123 4567"
                    className="w-full bg-transparent outline-none text-accent-100 placeholder:text-muted-500 text-base"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                <p className="text-sm text-muted">
                  OTP will be sent to this number. Include the country code and ensure SMS reception.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-[0.45em] text-muted">
                      Verify code
                    </span>
                    <p className="text-lg font-semibold text-accent-100">
                      Enter the 6-digit code sent to {normalizedPhone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToPhone}
                    className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent-200 transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Edit number
                  </button>
                </div>

                <div className="flex items-center gap-3 px-6 py-5 rounded-3xl border border-white/8 bg-ocean-800/70 focus-within:border-accent-400/60 focus-within:shadow-glow transition">
                  <MessageSquare className="h-5 w-5 text-accent-300" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder="••••••"
                    className="w-full bg-transparent outline-none text-center text-2xl tracking-[0.6em] text-accent-100 placeholder:text-muted-500"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Didn&apos;t receive it?</span>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || resendTimer > 0}
                    className="inline-flex items-center gap-2 text-accent-200 hover:text-accent-100 disabled:text-muted-500 disabled:cursor-not-allowed transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isLoading}
              onClick={step === STEPS.PHONE ? handleSendOtp : handleOtpVerification}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-3xl bg-accent-500 hover:bg-accent-400 disabled:bg-accent-500/60 disabled:cursor-not-allowed text-white font-semibold text-base transition shadow-lg shadow-accent-500/20"
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {step === STEPS.PHONE ? 'Send OTP' : 'Verify & Continue'}
            </button>

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
