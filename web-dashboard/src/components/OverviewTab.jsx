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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-card-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading-lg text-lg">P&amp;L Performance</h3>
            <span className="text-xs uppercase tracking-[0.4em] text-muted">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#7C8DB5" tickLine={false} />
              <YAxis stroke="#7C8DB5" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#101A31',
                  border: '1px solid rgba(83,130,255,0.35)',
                  borderRadius: '16px',
                  color: '#E5ECFF'
                }}
              />
              <Line type="monotone" dataKey="pnl" stroke="#5382FF" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="app-card-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="heading-lg text-lg">Daily Revenue</h3>
            <span className="text-xs uppercase tracking-[0.4em] text-muted">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="#7C8DB5" tickLine={false} />
              <YAxis stroke="#7C8DB5" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#101A31',
                  border: '1px solid rgba(52,211,153,0.35)',
                  borderRadius: '16px',
                  color: '#E5ECFF'
                }}
              />
              <Bar dataKey="revenue" fill="#34D399" radius={[12, 12, 12, 12]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="app-card-soft p-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Win Rate</p>
          <p className="text-3xl font-semibold text-accent-100">
            {stats.trades.total_trades > 0
              ? (
                  ((stats.trades.total_trades - stats.trades.open_trades) / stats.trades.total_trades) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
        </div>
        <div className="app-card-soft p-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Average Confidence</p>
          <p className="text-3xl font-semibold text-accent-100">
            {stats.signals.avg_confidence.toFixed(1)}%
          </p>
        </div>
        <div className="app-card-soft p-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Total P&amp;L</p>
          <p
            className={`text-3xl font-semibold ${
              stats.trades.total_pnl >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            ₹{stats.trades.total_pnl.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab

