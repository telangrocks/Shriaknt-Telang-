import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useState, useEffect } from 'react'
import { api } from '../services/api'

const OverviewTab = ({ stats }) => {
  const [performanceData, setPerformanceData] = useState([])
  const [revenueData, setRevenueData] = useState([])

  useEffect(() => {
    fetchPerformanceData()
    fetchRevenueData()
    const interval = setInterval(() => {
      fetchPerformanceData()
      fetchRevenueData()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchPerformanceData = async () => {
    try {
      // Mock data - replace with actual API call
      const data = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        pnl: Math.random() * 1000 - 500,
        trades: Math.floor(Math.random() * 20) + 5
      }))
      setPerformanceData(data)
    } catch (error) {
      console.error('Error fetching performance data:', error)
    }
  }

  const fetchRevenueData = async () => {
    try {
      // Mock data - replace with actual API call
      const data = Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        revenue: Math.floor(Math.random() * 50000) + 10000
      }))
      setRevenueData(data)
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Chart */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">P&L Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
              <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Win Rate</p>
          <p className="text-2xl font-bold mt-2">
            {stats.trades.total_trades > 0
              ? ((stats.trades.total_trades - stats.trades.open_trades) / stats.trades.total_trades * 100).toFixed(1)
              : 0}%
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Average Confidence</p>
          <p className="text-2xl font-bold mt-2">{stats.signals.avg_confidence.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total P&L</p>
          <p className={`text-2xl font-bold mt-2 ${stats.trades.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ₹{stats.trades.total_pnl.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab

