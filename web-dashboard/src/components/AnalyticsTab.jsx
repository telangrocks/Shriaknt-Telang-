import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useState, useEffect } from 'react'
import { api } from '../services/api'

const AnalyticsTab = () => {
  const [tradeData, setTradeData] = useState([])
  const [volumeData, setVolumeData] = useState([])

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Mock data - replace with actual API calls
      const trades = Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        wins: Math.floor(Math.random() * 20) + 10,
        losses: Math.floor(Math.random() * 10) + 5
      }))
      setTradeData(trades)

      const volumes = [
        { name: 'Binance', value: 45 },
        { name: 'Bybit', value: 30 },
        { name: 'OKX', value: 25 }
      ]
      setVolumeData(volumes)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Chart */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Win/Loss Ratio</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
              <Bar dataKey="wins" stackId="a" fill="#10B981" />
              <Bar dataKey="losses" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exchange Volume Distribution */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Exchange Volume Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={volumeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {volumeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTab

