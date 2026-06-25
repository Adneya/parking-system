import React, { useState, useEffect, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  FiArrowLeft, FiUsers, FiMapPin, FiActivity, FiDollarSign,
  FiAlertTriangle, FiRefreshCw, FiTrendingUp, FiCheckCircle,
  FiEdit2, FiToggleLeft, FiToggleRight, FiCalendar,
  FiUserCheck, FiUserX,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  getAdminDashboard, getAdminAnalytics,
  getAdminUsers, updateAdminUser,
  getAdminSpots, updateAdminSpot,
} from '../services/api'
import { AuthContext } from '../context/AuthContext.jsx'

const BG  = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: FiActivity },
  { id: 'users',       label: 'Users',       icon: FiUsers },
  { id: 'spots',       label: 'Spots',       icon: FiMapPin },
  { id: 'analytics',   label: 'Analytics',   icon: FiTrendingUp },
]

function StatCard({ label, value, sub, color, icon, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl p-5 flex flex-col gap-2" style={GLS}>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          {React.createElement(icon, { size: 16, style: { color } })}
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value ?? '—'}</p>
      {sub && <p className="text-gray-500 text-xs">{sub}</p>}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <p className="text-gray-300 font-semibold mb-1">{label}</p>
      {payload.map(p => {
        // Skip rendering object values (recharts sometimes passes complex data)
        if (typeof p.value === 'object' && p.value !== null) return null
        return <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      })}
    </div>
  )
}

function UserRow({ user, onToggle, idx }) {
  const [loading, setLoading] = useState(false)
  const handleToggle = async () => {
    setLoading(true)
    try { await onToggle(user._id, !user.isActive) }
    catch (_) { toast.error('Update failed') }
    finally { setLoading(false) }
  }
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
      className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{user.name}</p>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
          style={{ background: user.role === 'admin' ? 'rgba(168,85,247,0.2)' : 'rgba(99,102,241,0.15)', color: user.role === 'admin' ? '#c084fc' : '#818cf8' }}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
          {user.isActive ? '● Active' : '● Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <button onClick={handleToggle} disabled={loading}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: user.isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }}>
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full" />
            : user.isActive
            ? <FiToggleRight size={16} className="text-red-400" />
            : <FiToggleLeft  size={16} className="text-green-400" />
          }
        </button>
      </td>
    </motion.tr>
  )
}

function SpotRow({ spot, onUpdateStatus, idx }) {
  const [loading, setLoading] = useState(false)
  const toggle = async () => {
    setLoading(true)
    try { await onUpdateStatus(spot._id, spot.status === 'active' ? 'maintenance' : 'active') }
    catch (_) { toast.error('Update failed') }
    finally { setLoading(false) }
  }
  const statusColor = spot.status === 'active' ? '#10b981' : spot.status === 'inactive' ? '#ef4444' : '#f59e0b'
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
      className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <p className="text-white font-semibold text-sm">{spot.name || `Spot ${idx + 1}`}</p>
        <p className="text-gray-500 text-xs truncate max-w-xs">{spot.address || 'No address'}</p>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">{spot.city || '—'}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{spot.availableSpots ?? 0}/{spot.totalSpots ?? 0} free</td>
      <td className="px-4 py-3">
        <span className="text-xs font-bold capitalize" style={{ color: statusColor }}>● {spot.status}</span>
      </td>
      <td className="px-4 py-3 text-gray-300 text-sm">₹{spot.hourlyRate}/hr</td>
      <td className="px-4 py-3">
        <button onClick={toggle} disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: spot.status === 'active' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
            color:      spot.status === 'active' ? '#f59e0b' : '#10b981',
          }}>
          <FiEdit2 size={11} /> {spot.status === 'active' ? 'Maintenance' : 'Activate'}
        </button>
      </td>
    </motion.tr>
  )
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user: currentUser } = useContext(AuthContext)
  const [tab, setTab]           = useState('overview')
  const [dash, setDash]         = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers]       = useState([])
  const [spots, setSpots]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDash = useCallback(async () => {
    try { const r = await getAdminDashboard(); setDash(r.data.data) } catch (_) {}
  }, [])

  const loadAnalytics = useCallback(async () => {
    try { const r = await getAdminAnalytics(); setAnalytics(r.data.data) } catch (_) {}
  }, [])

  const loadUsers = useCallback(async () => {
    try { const r = await getAdminUsers(); setUsers(r.data.data || []) } catch (_) {}
  }, [])

  const loadSpots = useCallback(async () => {
    try { const r = await getAdminSpots(); setSpots(r.data.data || []) } catch (_) {}
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadDash(), loadAnalytics()]).finally(() => setLoading(false))
  }, [loadDash, loadAnalytics])

  useEffect(() => {
    if (tab === 'users')   loadUsers()
    if (tab === 'spots')   loadSpots()
    if (tab === 'analytics') loadAnalytics()
  }, [tab, loadUsers, loadSpots, loadAnalytics])

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([loadDash(), loadAnalytics()])
    setRefreshing(false)
    toast.success('Dashboard refreshed')
  }

  const handleToggleUser = async (id, isActive) => {
    await updateAdminUser(id, { isActive })
    setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive } : u))
    toast.success(`User ${isActive ? 'activated' : 'deactivated'}`)
  }

  const handlePromoteUser = async (id, role) => {
    await updateAdminUser(id, { role })
    setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u))
    toast.success(`Role updated to ${role}`)
  }

  const handleUpdateSpotStatus = async (id, status) => {
    await updateAdminSpot(id, { status })
    setSpots(prev => prev.map(s => s._id === id ? { ...s, status } : s))
    toast.success(`Spot status → ${status}`)
  }

  const dashboard = {
    totalUsers: dash?.users?.total ?? dash?.totalUsers ?? 0,
    newUsersToday: dash?.users?.newToday ?? dash?.newUsersToday ?? 0,
    totalSpots: dash?.spots?.total ?? dash?.totalSpots ?? 0,
    occupiedSpots: dash?.spots?.occupied ?? dash?.occupiedSpots ?? 0,
    occupancyRate: dash?.spots?.occupancyRate ?? dash?.occupancyRate ?? 0,
    revenueToday: dash?.revenue?.today ?? dash?.revenueToday ?? 0,
    revenueMonth: dash?.revenue?.month ?? dash?.revenueMonth ?? 0,
    activeBookings: dash?.bookings?.active ?? dash?.activeBookings ?? 0,
    openAlerts: dash?.alerts?.open ?? dash?.openAlerts ?? 0,
    activeRentals: dash?.rentals?.active ?? dash?.activeRentals ?? 0,
    damageCount: dash?.damage?.today ?? dash?.damageCount ?? 0,
  }

  // Prepare hourly chart data
  const hourlyData = dash?.hourlyOccupancy
    ? dash.hourlyOccupancy.map((v, i) => {
        const hour = typeof v === 'object' ? v.hour : i
        const bookingCount = typeof v === 'object' ? (v.bookings ?? 0) : v
        const occupancy = dashboard.totalSpots
          ? Math.min(100, Math.round((bookingCount / dashboard.totalSpots) * 100))
          : bookingCount
        return { hour: `${hour}:00`, occupancy, bookings: bookingCount }
      })
    : []

  const analyticsDays = Array.isArray(analytics) ? analytics : analytics?.daily
  const weeklyData = analyticsDays
    ? analyticsDays.map(d => ({ date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }), bookings: d.bookings, revenue: d.revenue }))
    : []

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="fixed top-1/4 right-1/3 w-96 h-96 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center gap-3"
        style={{ background: 'rgba(15,12,41,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <FiArrowLeft size={18} /> Dashboard
        </motion.button>
        <div className="flex items-center gap-2 ml-1">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>ADMIN</span>
          <span className="text-white font-bold text-sm hidden sm:block">Monitoring Dashboard</span>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                color:      tab === t.id ? '#fff' : '#9ca3af',
              }}>
              {React.createElement(t.icon, { size: 12 })} {t.label}
            </button>
          ))}
        </div>
        <motion.button whileHover={{ scale: 1.05 }} onClick={refresh}
          className="p-2 rounded-lg text-gray-400 hover:text-white ml-auto"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <FiRefreshCw size={15} />
          </motion.div>
        </motion.button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Users"    value={dashboard.totalUsers}    color="#8b5cf6" icon={FiUsers}        delay={0}   sub={`+${dashboard.newUsersToday} today`} />
                    <StatCard label="Parking Spots"  value={dashboard.totalSpots}    color="#6366f1" icon={FiMapPin}       delay={0.05} sub={`${dashboard.occupiedSpots} occupied`} />
                    <StatCard label="Occupancy"      value={`${dashboard.occupancyRate}%`} color="#f59e0b" icon={FiActivity} delay={0.1} />
                    <StatCard label="Today Revenue"  value={`₹${dashboard.revenueToday}`} color="#10b981" icon={FiDollarSign} delay={0.15} sub={`₹${dashboard.revenueMonth} this month`} />
                    <StatCard label="Active Bookings" value={dashboard.activeBookings} color="#60a5fa" icon={FiCalendar}   delay={0.2} />
                    <StatCard label="Open Alerts"    value={dashboard.openAlerts}    color="#ef4444" icon={FiAlertTriangle} delay={0.25} />
                    <StatCard label="Active Rentals" value={dashboard.activeRentals} color="#a78bfa" icon={FiCheckCircle} delay={0.3} />
                    <StatCard label="Damage Reports" value={dashboard.damageCount}   color="#f97316" icon={FiAlertTriangle} delay={0.35} />
                  </div>

                  {/* Hourly occupancy chart */}
                  {hourlyData.length > 0 && (
                    <div className="rounded-2xl p-6 mb-6" style={GLS}>
                      <h3 className="text-white font-bold mb-6">Hourly Occupancy — Today</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="occupancy" name="Occupancy %" radius={[4,4,0,0]}
                            fill="url(#hourlyGrad)" />
                          <defs>
                            <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Recent bookings + alerts side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent bookings */}
                    <div className="rounded-2xl p-6" style={GLS}>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiCalendar className="text-purple-400" size={16} /> Recent Bookings</h3>
                      {(dash?.recentBookings || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No recent bookings.</p>
                      ) : (
                        <div className="space-y-3">
                          {(dash.recentBookings || []).slice(0, 5).map((b, i) => (
                            <div key={b._id || i} className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                              <div>
                                <p className="text-white text-sm font-semibold">{b.vehicle?.licensePlate || 'N/A'}</p>
                                <p className="text-gray-500 text-xs">Spot {b.spot?.spotNumber || '—'} · {b.user?.name || 'Guest'}</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                                  style={{
                                    background: b.status === 'confirmed' ? 'rgba(16,185,129,0.15)' : b.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                                    color:      b.status === 'confirmed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : '#818cf8',
                                  }}>
                                  {b.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent alerts */}
                    <div className="rounded-2xl p-6" style={GLS}>
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiAlertTriangle className="text-red-400" size={16} /> Recent Alerts</h3>
                      {(dash?.recentAlerts || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No active alerts. ✅</p>
                      ) : (
                        <div className="space-y-3">
                          {(dash.recentAlerts || []).slice(0, 5).map((a, i) => (
                            <div key={a._id || i} className="flex items-center gap-3 py-2 border-b border-white/[0.05]">
                              <div className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#6366f1' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{a.title}</p>
                                <p className="text-gray-500 text-xs capitalize">{a.alertType?.replace(/_/g,' ')}</p>
                              </div>
                              <span className="text-xs capitalize" style={{ color: a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#818cf8' }}>
                                {a.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── Analytics ── */}
          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-black text-white mb-6">7-Day Analytics</h2>
              {weeklyData.length === 0 ? (
                <div className="text-center py-20">
                  <FiTrendingUp className="text-gray-500 mx-auto mb-4" size={40} />
                  <p className="text-gray-400">No analytics data available yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bookings chart */}
                  <div className="rounded-2xl p-6" style={GLS}>
                    <h3 className="text-white font-bold mb-4">Daily Bookings</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#8b5cf6"
                          strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue chart */}
                  <div className="rounded-2xl p-6" style={GLS}>
                    <h3 className="text-white font-bold mb-4">Daily Revenue (₹)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" name="Revenue ₹" radius={[4,4,0,0]} fill="url(#revGrad)" />
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#10b981" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">User Management</h2>
                <span className="text-gray-400 text-sm">{users.length} users</span>
              </div>
              <div className="rounded-2xl overflow-hidden" style={GLS}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <UserRow key={u._id} user={u} onToggle={handleToggleUser} onPromote={handlePromoteUser} currentUserId={currentUser?.id} idx={i} />
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No users found.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Spots ── */}
          {tab === 'spots' && (
            <motion.div key="spots" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">Spot Management</h2>
                <span className="text-gray-400 text-sm">{spots.length} spots</span>
              </div>
              <div className="rounded-2xl overflow-hidden" style={GLS}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {['Spot Name', 'City', 'Capacity', 'Status', 'Rate', 'Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {spots.map((s, i) => (
                        <SpotRow key={s._id} spot={s} onUpdateStatus={handleUpdateSpotStatus} idx={i} />
                      ))}
                    </tbody>
                  </table>
                  {spots.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No spots found.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
