import { useState, useEffect } from 'react'
import { Signal, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '../services/api'

const SignalsTab = () => {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchSignals = async () => {
    try {
      const response = await api.get('/market/signals?limit=50')
      setSignals(response.data.signals)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching signals:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading signals...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Trading Signals</h2>
        <span className="text-sm text-gray-400">{signals.length} signals</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
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
                Stop Loss
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Take Profit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {signals.map((signal) => (
              <tr key={signal.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {signal.exchange_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{signal.trading_pair}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {signal.signal_type === 'BUY' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      BUY
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      SELL
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">${parseFloat(signal.entry_price).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">${parseFloat(signal.stop_loss).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">${parseFloat(signal.take_profit).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Signal className="h-4 w-4 mr-1 text-purple-500" />
                    <span className="text-sm font-medium">{signal.confidence_score}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {new Date(signal.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SignalsTab

