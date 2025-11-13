const GlassCard = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-3xl border border-slate-800/60 bg-slate-900/65 shadow-[0_40px_120px_-40px_rgba(37,99,235,0.45)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

export default GlassCard


