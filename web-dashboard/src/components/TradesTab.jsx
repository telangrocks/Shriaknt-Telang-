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
    return <div className="text-center py-8">Loading trades...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Trade History</h2>
        <span className="text-sm text-gray-400">{trades.length} trades</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Exchange
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Pair
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Entry Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Executed
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{trade.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{trade.exchange_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{trade.trading_pair}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.trade_type === 'BUY'
                        ? 'bg-green-900 text-green-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {trade.trade_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">${parseFloat(trade.entry_price).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{parseFloat(trade.quantity).toFixed(4)}</td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    parseFloat(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  ₹{parseFloat(trade.pnl).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.status === 'open'
                        ? 'bg-yellow-900 text-yellow-200'
                        : trade.status === 'closed'
                        ? 'bg-gray-900 text-gray-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {trade.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
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

