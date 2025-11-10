import { useCallback, useEffect, useMemo, useState } from 'react'
import { Phone, ShieldCheck, RefreshCcw, Loader2, RotateCcw } from 'lucide-react'
import { api } from '../services/api'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/
const OTP_REGEX = /^\d{6}$/
const RESEND_COOLDOWN_SECONDS = 45

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

const formatSeconds = (seconds) => {
  if (seconds == null) {
    return ''
  }
  const clamped = Math.max(0, seconds)
  const minutes = Math.floor(clamped / 60)
  const remainder = clamped % 60
  if (minutes <= 0) {
    return `${remainder}s`
  }
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`
}

const Registration = ({ setIsAuthenticated }) => {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastAction, setLastAction] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(null)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }
    const interval = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [resendCooldown])

  useEffect(() => {
    if (otpExpirySeconds == null || otpExpirySeconds <= 0) {
      return
    }
    const interval = window.setInterval(() => {
      setOtpExpirySeconds((prev) => {
        if (prev == null) {
          return prev
        }
        return prev > 0 ? prev - 1 : 0
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [otpExpirySeconds])

  const phoneIsValid = useMemo(() => PHONE_REGEX.test(phone.trim()), [phone])
  const otpIsValid = useMemo(() => OTP_REGEX.test(otp.trim()), [otp])

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type })
  }, [])

  const persistSession = useCallback((token, refreshToken) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  }, [])

  const handleRequestOtp = useCallback(async () => {
    const normalizedPhone = phone.trim()

    if (!PHONE_REGEX.test(normalizedPhone)) {
      showStatus('Please enter a valid phone number including country code.', 'error')
      return
    }

    setIsLoading(true)
    setLastAction('request')
    showStatus('Contacting Cryptopulse servers…', 'info')

    try {
      const { data } = await api.post('/auth/request-otp', { phone: normalizedPhone })
      const successMessage =
        data?.message || 'OTP sent successfully. Please enter the 6-digit code.'
      showStatus(successMessage, 'success')
      setStep(2)
      setOtp('')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtpExpirySeconds(data?.expiresIn ?? 300)
    } catch (error) {
      showStatus(resolveErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [phone, showStatus])

  const handleVerifyOtp = useCallback(async () => {
    const normalizedPhone = phone.trim()
    const normalizedOtp = otp.trim()

    if (!PHONE_REGEX.test(normalizedPhone)) {
      showStatus('Please enter a valid phone number including country code.', 'error')
      return
    }

    if (!OTP_REGEX.test(normalizedOtp)) {
      showStatus('Enter the 6-digit OTP we sent you to continue.', 'error')
      return
    }

    setIsLoading(true)
    setLastAction('verify')
    showStatus('Verifying your code…', 'info')

    try {
      const { data } = await api.post('/auth/verify-otp', {
        phone: normalizedPhone,
        otp: normalizedOtp
      })

      if (data?.success && data?.token) {
        persistSession(data.token, data?.refreshToken)
        showStatus(
          data?.message || 'Phone verified. Redirecting you to the dashboard…',
          'success'
        )
        setIsAuthenticated(true)
      } else {
        showStatus(
          data?.message || data?.error || 'Verification failed. Please try again.',
          'error'
        )
      }
    } catch (error) {
      showStatus(resolveErrorMessage(error), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [otp, persistSession, phone, setIsAuthenticated, showStatus])

  const handleRetry = () => {
    if (isLoading) return
    if (lastAction === 'request') {
      handleRequestOtp()
    } else if (lastAction === 'verify') {
      handleVerifyOtp()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (step === 1) {
      handleRequestOtp()
    } else {
      handleVerifyOtp()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-blue-400/50 bg-blue-500/10 text-blue-200 text-xs uppercase tracking-[0.35em]">
            Cryptopulse
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white">
            Register your phone
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Step {step} of 2 · Secure access to your Cryptopulse account
          </p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur border border-slate-800/80 rounded-3xl shadow-2xl p-8 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <ShieldCheck className="h-10 w-10 text-blue-400" />
            <div className="text-sm text-slate-300 text-left">
              <p className="font-medium text-white">
                Multi-factor security powered by Cryptopulse AI
              </p>
              <p className="mt-1">
                We use OTP verification to keep your trading operations safe and compliant.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label
                className="block text-sm font-medium text-slate-300"
                htmlFor="phone-number"
              >
                Phone Number
              </label>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                  phoneIsValid ? 'border-blue-500/60' : 'border-slate-700'
                } bg-slate-900/80 focus-within:ring-2 focus-within:ring-blue-500/60`}
              >
                <Phone className="h-5 w-5 text-blue-300" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  className="w-full bg-transparent outline-none text-white placeholder:text-slate-500"
                  id="phone-number"
                  name="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <p className="text-xs text-slate-400">
                OTP will be sent to this number. Include country code and ensure SMS reception.
              </p>
            </div>

            {step === 2 && (
              <div className="space-y-4">
                <label
                  className="block text-sm font-medium text-slate-300"
                  htmlFor="otp-code"
                >
                  One-Time Passcode
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900/80 text-center tracking-[0.4em] text-lg text-white outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/40"
                  id="otp-code"
                  name="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    {otpExpirySeconds != null && otpExpirySeconds > 0
                      ? `OTP expires in ${formatSeconds(otpExpirySeconds)}`
                      : 'OTP has expired. Request a new one.'}
                  </span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleRequestOtp}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
                      resendCooldown > 0 || isLoading
                        ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                        : 'border-blue-500/60 text-blue-300 hover:text-blue-200 hover:border-blue-400'
                    }`}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {resendCooldown > 0 ? `Resend in ${formatSeconds(resendCooldown)}` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/60 disabled:cursor-not-allowed text-white font-medium transition"
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {step === 1 ? 'Send OTP' : 'Verify & Sign In'}
            </button>
          </form>

          {status && (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm ${
                status.type === 'error'
                  ? 'border-red-500/60 bg-red-500/10 text-red-200'
                  : status.type === 'success'
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                  : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p>{status.message}</p>
                {status.type === 'error' && lastAction && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-current text-xs uppercase tracking-wide hover:bg-white/10 disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Registration


