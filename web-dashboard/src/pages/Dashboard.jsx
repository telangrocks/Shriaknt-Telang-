import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Signal,
  Activity,
  LogOut
} from 'lucide-react'
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
    const interval = setInterval(fetchStats, 5000)
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

  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: Activity },
      { id: 'signals', label: 'Signals', icon: Signal },
      { id: 'trades', label: 'Trades', icon: TrendingUp },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'users', label: 'Users', icon: Users }
    ],
    []
  )

  const statCards = [
    {
      id: 'total-users',
      label: 'Total Users',
      value: stats.users.total_users,
      icon: Users,
      accent: 'text-accent-200 bg-accent-500/10'
    },
    {
      id: 'active-subscriptions',
      label: 'Active Subscriptions',
      value: stats.users.active_subscriptions,
      icon: TrendingUp,
      accent: 'text-success bg-success/10'
    },
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: `₹${stats.payments.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      accent: 'text-warning bg-warning/10'
    },
    {
      id: 'active-signals',
      label: 'Active Signals',
      value: stats.signals.active_signals,
      icon: Signal,
      accent: 'text-accent-300 bg-accent-500/10'
    }
  ]

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-10 space-y-10">
      <header className="app-card p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <span className="app-pill">Cryptopulse Command</span>
          <div>
            <h1 className="heading-xl">Operations Control Center</h1>
            <p className="text-muted text-base mt-2 max-w-2xl">
              Monitor AI-driven trading intelligence, session security, and subscription health from
              one mission-grade dashboard.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border border-danger/40 bg-danger/10 px-5 py-3 text-sm font-medium text-danger hover:bg-danger/20 transition"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.id} className="app-card-soft p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted">{card.label}</p>
                  <p className="text-3xl font-semibold text-accent-100 mt-3">{card.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="app-card p-8 space-y-8">
        <nav className="flex flex-wrap gap-3" aria-label="Dashboard tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent-500 text-white shadow-glow'
                    : 'border border-white/10 bg-transparent text-muted hover:border-accent-400/40 hover:text-accent-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="app-card-soft p-6 border border-white/8">
          {activeTab === 'overview' && <OverviewTab stats={stats} />}
          {activeTab === 'signals' && <SignalsTab />}
          {activeTab === 'trades' && <TradesTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </section>
    </div>
  )
}

export default Dashboard

