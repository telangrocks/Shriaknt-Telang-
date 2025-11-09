import { useEffect, useState } from 'react'

const phrases = [
  'Initializing secure trading environment…',
  'Fetching AI-driven market insights…',
  'Calibrating strategy engine…',
  'Sharpening Cryptopulse intelligence…'
]

const Splash = () => {
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length)
    }, 1200)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-blue-500/60 bg-blue-500/10 text-blue-200 uppercase tracking-[0.35em] text-xs sm:text-sm">
          Cryptopulse
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white">
          Shrikant Telang — Virtual Software Engineer
        </h1>
        <p className="text-lg sm:text-xl text-slate-300">
          Sign in to continue to your account
        </p>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-1 w-32 sm:w-40 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-pulse" />
          <p className="text-sm sm:text-base transition-all duration-500 ease-out">
            {phrases[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Splash


