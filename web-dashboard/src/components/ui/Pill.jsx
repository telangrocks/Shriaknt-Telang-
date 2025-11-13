const Pill = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border border-blue-400/50 bg-blue-500/10 px-6 py-2 tracking-[0.35em] uppercase text-xs text-blue-200 ${className}`}
    >
      {children}
    </span>
  )
}

export default Pill


