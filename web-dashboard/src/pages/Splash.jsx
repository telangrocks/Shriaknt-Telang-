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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center space-y-8">
        <span className="app-pill text-sm sm:text-base">Cryptopulse</span>
        <h1 className="heading-xl text-3xl sm:text-4xl md:text-5xl">
          Initializing Secure Trading Environment
        </h1>
        <p className="text-base sm:text-lg text-muted">
          Please hold while we synchronize your AI-driven market intelligence suite.
        </p>
        <div className="flex flex-col items-center gap-4 text-muted">
          <div className="h-1.5 w-40 sm:w-56 rounded-full bg-gradient-to-r from-accent-500 via-accent-300 to-success animate-pulse" />
          <p className="text-sm sm:text-base transition-all duration-500 ease-out">
            {phrases[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Splash


