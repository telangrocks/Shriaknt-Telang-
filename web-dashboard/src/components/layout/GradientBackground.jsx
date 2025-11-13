const GradientBackground = ({ children, className = '' }) => {
  return (
    <div
      className={`relative min-h-screen bg-[#020617] text-slate-100 overflow-hidden ${className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        <div className="absolute bottom-[-12rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default GradientBackground


