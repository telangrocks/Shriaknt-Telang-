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

  const COLORS = ['#5382FF', '#34D399', '#FBBF24']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-card-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading-lg text-lg">Win/Loss Ratio</h3>
            <span className="text-xs uppercase tracking-[0.4em] text-muted">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tradeData}>
              <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" stroke="#7C8DB5" tickLine={false} />
              <YAxis stroke="#7C8DB5" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#101A31',
                  border: '1px solid rgba(83,130,255,0.35)',
                  borderRadius: '16px',
                  color: '#E5ECFF'
                }}
              />
              <Bar dataKey="wins" stackId="a" fill="#34D399" radius={[12, 12, 0, 0]} />
              <Bar dataKey="losses" stackId="a" fill="#F87171" radius={[0, 0, 12, 12]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="app-card-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading-lg text-lg">Exchange Volume Distribution</h3>
            <span className="text-xs uppercase tracking-[0.4em] text-muted">Live split</span>
          </div>
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
              <Tooltip
                contentStyle={{
                  background: '#101A31',
                  border: '1px solid rgba(83,130,255,0.35)',
                  borderRadius: '16px',
                  color: '#E5ECFF'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTab

