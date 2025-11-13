import { useState, useEffect } from 'react'
import { api } from '../services/api'

const UsersTab = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
    const interval = setInterval(fetchUsers, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users?limit=50')
      setUsers(response.data.users)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching users:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading users…</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="heading-lg text-xl">User Management</h2>
          <p className="text-sm text-muted">Real-time roster of verified Cryptopulse accounts</p>
        </div>
        <span className="text-sm text-muted uppercase tracking-[0.4em]">{users.length} users</span>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/5">
        <table className="min-w-full divide-y divide-white/6 text-sm">
          <thead className="bg-ocean-900/60">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.4em] text-muted">
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Subscription</th>
              <th className="px-6 py-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-ocean-900/30">
            {users.map((user) => (
              <tr key={user.id} className="transition hover:bg-ocean-900/60 hover:backdrop-blur-md">
                <td className="px-6 py-4 text-accent-100/90">{user.id}</td>
                <td className="px-6 py-4 text-accent-100/90">{user.phone}</td>
                <td className="px-6 py-4 text-accent-100/90">{user.name || '-'}</td>
                <td className="px-6 py-4 text-accent-100/90">{user.email || '-'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                      user.subscription_status === 'active'
                        ? 'bg-success/10 text-success'
                        : user.subscription_status === 'trial'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {user.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted">
                  {new Date(user.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UsersTab

