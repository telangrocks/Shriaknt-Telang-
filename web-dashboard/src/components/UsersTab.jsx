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
    return <div className="text-center py-8">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">User Management</h2>
        <span className="text-sm text-gray-400">{users.length} users</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription_status === 'active'
                        ? 'bg-green-900 text-green-200'
                        : user.subscription_status === 'trial'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {user.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
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

