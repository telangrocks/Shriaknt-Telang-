import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign, Signal, Activity } from 'lucide-react'
import OverviewTab from '../components/OverviewTab'
import SignalsTab from '../components/SignalsTab'
import TradesTab from '../components/TradesTab'
import AnalyticsTab from '../components/AnalyticsTab'
import UsersTab from '../components/UsersTab'
import { api } from '../services/api'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../constants/auth'

const Dashboard = ({ setIsAuthenticated }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    users: { total_users: 0, active_subscriptions: 0, trial_users: 0 },
    trades: { total_trades: 0, open_trades: 0, total_pnl: 0 },
    payments: { total_revenue: 0, successful_payments: 0 },
    signals: { total_signals: 0, active_signals: 0, avg_confidence: 0 }
  })

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setIsAuthenticated(false)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'signals', label: 'Signals', icon: Signal },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-500 mr-2" />
              <h1 className="text-2xl font-bold">Cryptopulse Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold mt-2">{stats.users.total_users}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Subscriptions</p>
                <p className="text-3xl font-bold mt-2">{stats.users.active_subscriptions}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">₹{stats.payments.total_revenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Signals</p>
                <p className="text-3xl font-bold mt-2">{stats.signals.active_signals}</p>
              </div>
              <Signal className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-500'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    } flex items-center py-4 px-1 border-b-2 font-medium text-sm transition`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'signals' && <SignalsTab />}
            {activeTab === 'trades' && <TradesTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'users' && <UsersTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

