const PrimaryButton = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 px-6 py-3 font-medium text-white transition hover:from-blue-500 hover:via-blue-500 hover:to-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default PrimaryButton


