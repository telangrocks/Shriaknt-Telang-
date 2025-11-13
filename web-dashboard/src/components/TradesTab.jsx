import { useState, useEffect } from 'react'
import { api } from '../services/api'

const TradesTab = () => {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrades()
    const interval = setInterval(fetchTrades, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTrades = async () => {
    try {
      const response = await api.get('/admin/trades?limit=50')
      setTrades(response.data.trades)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching trades:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading trades…</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-lg text-xl">Trade History</h2>
          <p className="text-sm text-muted">Live execution feed from integrated exchanges</p>
        </div>
        <span className="text-sm text-muted uppercase tracking-[0.4em]">
          {trades.length} trades
        </span>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/5">
        <table className="min-w-full divide-y divide-white/6 text-sm">
          <thead className="bg-ocean-900/60">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.4em] text-muted">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Exchange</th>
              <th className="px-6 py-4">Pair</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Entry Price</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">P&amp;L</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Executed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-ocean-900/30">
            {trades.map((trade) => (
              <tr key={trade.id} className="transition hover:bg-ocean-900/60 hover:backdrop-blur-md">
                <td className="px-6 py-4 text-accent-100/90">{trade.phone}</td>
                <td className="px-6 py-4 text-accent-100/90">{trade.exchange_name}</td>
                <td className="px-6 py-4 text-accent-100/90">{trade.trading_pair}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      trade.trade_type === 'BUY'
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {trade.trade_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-accent-100/90">
                  ${parseFloat(trade.entry_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-accent-100/90">
                  {parseFloat(trade.quantity).toFixed(4)}
                </td>
                <td
                  className={`px-6 py-4 font-semibold ${
                    parseFloat(trade.pnl) >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  ₹{parseFloat(trade.pnl).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      trade.status === 'open'
                        ? 'bg-warning/10 text-warning'
                        : trade.status === 'closed'
                        ? 'bg-accent-500/10 text-accent-200'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {trade.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted">
                  {new Date(trade.executed_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TradesTab

