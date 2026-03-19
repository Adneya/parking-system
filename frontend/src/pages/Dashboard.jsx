import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { FiLogOut, FiTruck, FiBarChart2, FiAward, FiClock, FiSettings, FiUsers, FiCreditCard, FiTrendingUp, FiMapPin, FiPlus, FiBell, FiChevronRight, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useNavigate, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

// Sample data for charts
const weeklyData = [
  { day: 'Mon', sessions: 2, hours: 3.5 }, { day: 'Tue', sessions: 1, hours: 2 },
  { day: 'Wed', sessions: 3, hours: 6 }, { day: 'Thu', sessions: 2, hours: 4 },
  { day: 'Fri', sessions: 4, hours: 8.5 }, { day: 'Sat', sessions: 1, hours: 1.5 },
  { day: 'Sun', sessions: 0, hours: 0 },
]
const tierColors = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#f59e0b', platinum: '#8b5cf6' }
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899']

const StatCard = ({ icon: Icon, label, value, gradient, iconColor, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
    className="rounded-2xl p-6 relative overflow-hidden"
    style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-xl" style={{ background: gradient }} />
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: gradient }}>
        <Icon className="text-white" size={22} />
      </div>
      <FiTrendingUp className="text-green-400 opacity-70" size={16} />
    </div>
    <p className="text-gray-400 text-sm font-medium">{label}</p>
    <p className="text-3xl font-black text-white mt-1">{value}</p>
  </motion.div>
)

const Dashboard = () => {
  const { user, logout, getAnalytics, getLoyalty, getVehicles, addVehicle, deleteVehicle, getSpots, seedSpots, startSession, endSession, cancelSession, getActiveSession, getSessionHistory } = useContext(AuthContext)
  const [analytics, setAnalytics] = useState(null)
  const [loyalty, setLoyalty] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [sessionHistory, setSessionHistory] = useState([])
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ licensePlate: '', make: '', model: '', year: '', color: '', type: 'sedan' })
  const [startingSession, setStartingSession] = useState(null) // spotId being booked
  const [sessionLicensePlate, setSessionLicensePlate] = useState('')
  const navigate = useNavigate()

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [analyticsData, loyaltyData, vehiclesData, activeSessionData, historyData] = await Promise.allSettled([
        getAnalytics?.(),
        getLoyalty?.(),
        getVehicles?.(),
        getActiveSession?.(),
        getSessionHistory?.({ limit: 5 }),
      ])
      setAnalytics(analyticsData?.value ?? null)
      setLoyalty(loyaltyData?.value ?? null)
      setVehicles(vehiclesData?.value ?? [])
      setActiveSession(activeSessionData?.value ?? null)
      setSessionHistory(historyData?.value?.sessions ?? [])
    } catch (err) {
      console.error('Dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpots = useCallback(async (filters = {}) => {
    setSpotsLoading(true)
    try {
      const data = await getSpots?.(filters)
      if (data?.spots?.length === 0) {
        // Auto-seed if empty
        await seedSpots?.()
        const seeded = await getSpots?.(filters)
        setSpots(seeded?.spots ?? [])
      } else {
        setSpots(data?.spots ?? [])
      }
    } catch (err) {
      toast.error('Could not load parking spots')
    } finally {
      setSpotsLoading(false)
    }
  }, [getSpots, seedSpots])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'parking' && spots.length === 0) fetchSpots()
  }

  const handleAddVehicle = async (e) => {
    e.preventDefault()
    try {
      await addVehicle(vehicleForm)
      toast.success('Vehicle added!')
      setShowAddVehicle(false)
      setVehicleForm({ licensePlate: '', make: '', model: '', year: '', color: '', type: 'sedan' })
      const updated = await getVehicles()
      setVehicles(updated ?? [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vehicle')
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId)
      toast.success('Vehicle removed')
      const updated = await getVehicles()
      setVehicles(updated ?? [])
    } catch (err) {
      toast.error('Failed to remove vehicle')
    }
  }

  const handleStartSession = async (spotId) => {
    if (!sessionLicensePlate.trim()) {
      toast.error('Enter your license plate first')
      return
    }
    try {
      const data = await startSession({ spotId, licensePlate: sessionLicensePlate })
      setActiveSession(data.session)
      setStartingSession(null)
      setSessionLicensePlate('')
      toast.success('Parking session started! 🚗')
      fetchDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start session')
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    try {
      const data = await endSession(activeSession._id)
      setActiveSession(null)
      toast.success(`Session ended! Cost: $${data.cost?.toFixed(2)} — +${data.pointsEarned} points 🎉`)
      fetchDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end session')
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const tierColor = tierColors[loyalty?.tier] || '#8b5cf6'
  const loyaltyProgress = ((loyalty?.points || 0) % 1000) / 10

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      <div className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto" />
        <p className="text-white/60 text-sm">Loading your dashboard…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />

      {/* Header / Sidebar overlay header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚗</div>
          <div>
            <span className="text-white font-black text-xl">Parking</span>
            <span className="text-purple-400 font-black text-xl">Pro</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {['overview', 'vehicles', 'parking', 'analytics', 'loyalty'].map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
              style={{
                background: activeTab === tab ? 'rgba(139,92,246,0.3)' : 'transparent',
                color: activeTab === tab ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                border: activeTab === tab ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent'
              }}>
              {tab === 'parking' ? '🅿 Find Parking' : tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-white text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-gray-400 text-xs">{user?.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <button onClick={() => navigate('/payment')} title="Upgrade Plan"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <FiCreditCard className="text-purple-400" size={17} />
          </button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <FiLogOut size={16} /> Logout
          </motion.button>
        </div>
      </motion.header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Active Session Banner — always visible when session is running */}
        <AnimatePresence>
          {activeSession && (
            <motion.div key="active-session-banner"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))', border: '1px solid rgba(16,185,129,0.4)' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.25)' }}>
                  <FiClock className="text-green-400" size={22} />
                </div>
                <div>
                  <p className="text-green-300 font-bold text-sm uppercase tracking-wide">Active Parking Session</p>
                  <p className="text-white font-semibold mt-0.5">{activeSession.spotId?.name || 'Parking Spot'}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Started: {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    &nbsp;· Plate: <span className="text-white font-medium">{activeSession.licensePlate}</span>
                  </p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleEndSession}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2 self-start sm:self-auto"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                <FiCheckCircle size={15} /> End Session
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              {/* Welcome banner */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="rounded-2xl p-7 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(168,85,247,0.3) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <motion.div animate={{ x: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity }}
                  className="absolute right-8 top-4 text-7xl opacity-20 select-none">🚗</motion.div>
                <h2 className="text-3xl font-black text-white">Good day, {user?.firstName}! 👋</h2>
                <p className="text-purple-300 mt-1 text-sm">Here's everything about your parking activity</p>
                <div className="flex items-center gap-3 mt-5">
                  <Link to="/payment">
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
                      <FiCreditCard size={15} /> Upgrade Plan
                    </motion.button>
                  </Link>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleTabChange('parking')}
                    className="px-5 py-2.5 rounded-xl text-purple-300 text-sm font-bold flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <FiMapPin size={15} /> Find Parking
                  </motion.button>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={FiClock} label="Active Sessions" value={analytics?.activeReservations ?? 0} gradient="linear-gradient(135deg,#06b6d4,#3b82f6)" delay={0.1} />
                <StatCard icon={FiTruck} label="Total Parkings" value={analytics?.totalParkings ?? 0} gradient="linear-gradient(135deg,#10b981,#059669)" delay={0.15} />
                <StatCard icon={FiBarChart2} label="Avg Duration" value={analytics?.avgDuration ?? '0h'} gradient="linear-gradient(135deg,#8b5cf6,#6366f1)" delay={0.2} />
                <StatCard icon={FiAward} label="Loyalty Points" value={loyalty?.points ?? 0} gradient="linear-gradient(135deg,#f59e0b,#ef4444)" delay={0.25} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="lg:col-span-2 rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-white font-bold text-lg">Weekly Activity</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Parking sessions this week</p>
                    </div>
                    <FiBarChart2 className="text-purple-400" size={20} />
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#fff' }} />
                      <Bar dataKey="sessions" fill="url(#purpleBar)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="purpleBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Loyalty mini-card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-5">Loyalty Status</h3>
                  <div className="text-center mb-5">
                    <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl mb-3"
                      style={{ background: `radial-gradient(circle, ${tierColor}40, ${tierColor}10)`, border: `2px solid ${tierColor}60` }}>
                      {loyalty?.tier === 'bronze' ? '🥉' : loyalty?.tier === 'silver' ? '🥈' : loyalty?.tier === 'gold' ? '🥇' : '🏆'}
                    </div>
                    <p className="text-white font-black text-xl capitalize">{loyalty?.tier || 'Bronze'}</p>
                    <p className="text-gray-400 text-sm mt-1">{loyalty?.points || 0} points</p>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Progress to next tier</span>
                      <span>{Math.round(loyaltyProgress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${loyaltyProgress}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${tierColor}, #a855f7)` }} />
                    </div>
                  </div>
                  <Link to="/payment">
                    <button className="w-full py-2 rounded-xl text-sm font-semibold text-purple-300 transition-all hover:bg-white/10"
                      style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
                      Upgrade for more points →
                    </button>
                  </Link>
                </motion.div>
              </div>

              {/* Recent Sessions + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sessions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <FiClock className="text-cyan-400" size={18} /> Recent Sessions
                    </h3>
                    <button onClick={() => handleTabChange('analytics')}
                      className="text-purple-400 text-xs hover:text-purple-300 transition-colors">View all →</button>
                  </div>
                  {sessionHistory.length > 0 ? (
                    <div className="space-y-3">
                      {sessionHistory.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2"
                          style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ background: s.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                              {s.status === 'completed' ? <FiCheckCircle className="text-green-400" size={14} /> : <FiAlertCircle className="text-red-400" size={14} />}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{s.spotId?.name || 'Parking Spot'}</p>
                              <p className="text-gray-500 text-xs">{new Date(s.startTime).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-semibold">${s.amount?.toFixed(2) || '0.00'}</p>
                            <p className="text-gray-500 text-xs">{s.duration ? `${s.duration.toFixed(1)}h` : '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2 opacity-30">🅿</div>
                      <p className="text-gray-400 text-sm">No parking history yet</p>
                      <button onClick={() => handleTabChange('parking')}
                        className="mt-3 text-purple-400 text-sm hover:text-purple-300 transition-colors">Find a spot →</button>
                    </div>
                  )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                    <FiSettings className="text-indigo-400" size={18} /> Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: FiCreditCard, label: 'Upgrade Plan', sub: 'Get more benefits', color: '#6366f1', action: () => navigate('/payment') },
                      { icon: FiTruck, label: 'Add Vehicle', sub: 'Register your car', color: '#10b981', action: () => handleTabChange('vehicles') },
                      { icon: FiUsers, label: 'View Analytics', sub: 'Your stats', color: '#f59e0b', action: () => handleTabChange('analytics') },
                      { icon: FiMapPin, label: 'Find Parking', sub: 'Nearby spots', color: '#ef4444', action: () => handleTabChange('parking') },
                    ].map((a, i) => (
                      <motion.button key={i} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={a.action}
                        className="p-4 rounded-xl text-left transition-all hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ background: `${a.color}25` }}>
                          <a.icon style={{ color: a.color }} size={18} />
                        </div>
                        <p className="text-white text-sm font-semibold">{a.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{a.sub}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* ── Advanced Feature Shortcuts ── */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <span className="text-purple-400">⚡</span> Advanced Platform Features
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { emoji: '🤖', label: 'Pre-Book',         sub: 'ML slot allocation',  color: '#8b5cf6', path: '/prebooking' },
                    { emoji: '🗺️', label: 'Live Map',        sub: 'Real-time sensors',   color: '#6366f1', path: '/livemap' },
                    { emoji: '📷', label: 'CV Inspect',      sub: 'Damage detection',     color: '#ec4899', path: '/inspection' },
                    { emoji: '🚗', label: 'Rentals',         sub: 'Host & browse',        color: '#10b981', path: '/rentals' },
                    { emoji: '📅', label: 'My Bookings',     sub: 'Vehicle rentals',      color: '#06b6d4', path: '/my-rental-bookings' },
                    { emoji: '🔧', label: 'Maintenance',     sub: 'Predictive alerts',    color: '#f59e0b', path: '/maintenance' },
                    ...(user?.role === 'admin'
                      ? [{ emoji: '🛡️', label: 'Admin Panel', sub: 'Monitoring',       color: '#ef4444', path: '/admin' }]
                      : []),
                  ].map((f, i) => (
                    <motion.button key={f.path} whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(f.path)}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.04 }}
                      className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all hover:bg-white/5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${f.color}25` }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: `${f.color}18`, boxShadow: `0 0 12px ${f.color}25` }}>
                        {f.emoji}
                      </div>
                      <div className="text-center">
                        <p className="text-white text-xs font-bold">{f.label}</p>
                        <p className="text-gray-500 text-xs mt-0.5 leading-tight">{f.sub}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── VEHICLES TAB ─── */}
          {activeTab === 'vehicles' && (
            <motion.div key="vehicles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">My Vehicles</h2>
                  <p className="text-gray-400 text-sm mt-0.5">Manage your registered vehicles</p>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddVehicle(v => !v)}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold flex items-center gap-2"
                  style={{ background: showAddVehicle ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#6366f1,#a855f7)', border: showAddVehicle ? '1px solid rgba(239,68,68,0.4)' : 'none' }}>
                  {showAddVehicle ? <><FiX size={15} /> Cancel</> : <><FiPlus size={15} /> Add Vehicle</>}
                </motion.button>
              </div>

              {/* Add Vehicle Form */}
              <AnimatePresence>
                {showAddVehicle && (
                  <motion.form key="add-vehicle-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    onSubmit={handleAddVehicle} className="rounded-2xl p-6 overflow-hidden"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <h3 className="text-white font-bold text-lg mb-5">Add New Vehicle</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'licensePlate', label: 'License Plate', placeholder: 'MH01AB1234' },
                        { name: 'make', label: 'Make', placeholder: 'Toyota' },
                        { name: 'model', label: 'Model', placeholder: 'Fortuner' },
                        { name: 'year', label: 'Year', placeholder: '2022' },
                        { name: 'color', label: 'Color', placeholder: 'White' },
                      ].map(field => (
                        <div key={field.name}>
                          <label className="block text-gray-400 text-xs font-medium mb-1.5">{field.label}</label>
                          <input value={vehicleForm[field.name]}
                            onChange={e => setVehicleForm(f => ({ ...f, [field.name]: e.target.value }))}
                            placeholder={field.placeholder} required
                            className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      ))}
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5">Type</label>
                        <select value={vehicleForm.type}
                          onChange={e => setVehicleForm(f => ({ ...f, type: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
                          style={{ background: 'rgba(30,27,75,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {['sedan', 'suv', 'hatchback', 'truck', 'motorcycle', 'other'].map(t => (
                            <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="submit"
                      className="mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                      Save Vehicle
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Vehicle list */}
              {vehicles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {vehicles.map((v, i) => (
                    <motion.div key={v._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}
                      className="rounded-2xl p-5 relative group"
                      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <button onClick={() => handleDeleteVehicle(v._id)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                        title="Remove vehicle">
                        <FiX className="text-red-400" size={14} />
                      </button>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        <FiTruck className="text-white" size={20} />
                      </div>
                      <p className="text-white font-bold">{v.make} {v.model}</p>
                      <p className="text-purple-300 text-sm font-mono mt-0.5">{v.licensePlate}</p>
                      <div className="flex items-center gap-3 mt-3 text-gray-400 text-xs">
                        {v.year && <span>{v.year}</span>}
                        {v.color && <span>· {v.color}</span>}
                        {v.type && <span>· {v.type}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div className="text-6xl mb-4 opacity-30">🚙</div>
                  <p className="text-gray-300 font-semibold">No vehicles added yet</p>
                  <p className="text-gray-500 text-sm mt-1">Add your first vehicle to get started</p>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddVehicle(true)}
                    className="mt-5 px-6 py-2.5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                    <FiPlus size={15} /> Add First Vehicle
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── PARKING TAB ─── */}
          {activeTab === 'parking' && (
            <motion.div key="parking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              <div>
                <h2 className="text-2xl font-black text-white">Find Parking</h2>
                <p className="text-gray-400 text-sm mt-0.5">Browse and book available parking spots near you</p>
              </div>

              {/* Search bar */}
              <div className="flex gap-3">
                <input id="city-filter" placeholder="Search by city (e.g. Mumbai)"
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onKeyDown={e => { if (e.key === 'Enter') fetchSpots({ city: e.target.value, available: true }) }} />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    const val = document.getElementById('city-filter')?.value
                    fetchSpots(val ? { city: val, available: true } : { available: true })
                  }}
                  className="px-5 py-3 rounded-xl text-white text-sm font-bold flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                  <FiMapPin size={15} /> Search
                </motion.button>
              </div>

              {/* Loading skeleton */}
              {spotsLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="rounded-2xl p-5 animate-pulse"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="h-4 w-2/3 rounded bg-white/10 mb-3" />
                      <div className="h-3 w-full rounded bg-white/10 mb-2" />
                      <div className="h-3 w-1/2 rounded bg-white/10 mb-5" />
                      <div className="h-8 w-full rounded-lg bg-white/10" />
                    </div>
                  ))}
                </div>
              )}

              {/* Spot cards */}
              {!spotsLoading && spots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {spots.map((spot, i) => (
                    <motion.div key={spot._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}
                      className="rounded-2xl p-5"
                      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-white font-bold truncate">{spot.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">{spot.address}, {spot.city}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-purple-300 font-black text-lg">${spot.hourlyRate}<span className="text-gray-400 text-xs font-normal">/hr</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${((spot.totalSpots - spot.availableSpots) / (spot.totalSpots || 1)) * 100}%`,
                              background: spot.availableSpots < 5 ? '#ef4444' : spot.availableSpots < 20 ? '#f59e0b' : '#10b981'
                            }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: spot.availableSpots < 5 ? '#ef4444' : spot.availableSpots < 20 ? '#f59e0b' : '#10b981' }}>
                          {spot.availableSpots}/{spot.totalSpots} free
                        </span>
                      </div>

                      {spot.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {spot.amenities.slice(0, 3).map(a => (
                            <span key={a} className="px-2 py-0.5 rounded-full text-xs text-purple-300 capitalize"
                              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Booking inline */}
                      <AnimatePresence>
                        {startingSession === spot._id ? (
                          <motion.div key="book-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                            <input value={sessionLicensePlate}
                              onChange={e => setSessionLicensePlate(e.target.value)}
                              placeholder="License plate (e.g. MH01AB1234)"
                              className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none font-mono"
                              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(139,92,246,0.4)' }} />
                            <div className="flex gap-2">
                              <motion.button whileTap={{ scale: 0.96 }}
                                onClick={() => handleStartSession(spot._id)}
                                className="flex-1 py-2 rounded-lg text-white text-sm font-bold"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                Confirm
                              </motion.button>
                              <button onClick={() => { setStartingSession(null); setSessionLicensePlate('') }}
                                className="px-3 py-2 rounded-lg text-gray-400 text-sm hover:bg-white/10 transition-all">
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.button key="book-btn" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            disabled={spot.availableSpots === 0 || !!activeSession}
                            onClick={() => setStartingSession(spot._id)}
                            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                            style={{
                              background: spot.availableSpots === 0 || activeSession ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
                              color: spot.availableSpots === 0 || activeSession ? '#6b7280' : '#fff',
                              cursor: spot.availableSpots === 0 || activeSession ? 'not-allowed' : 'pointer'
                            }}>
                            {spot.availableSpots === 0 ? 'Full' : activeSession ? 'Session Active' : 'Park Here 🅿'}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}

              {!spotsLoading && spots.length === 0 && (
                <div className="text-center py-20 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div className="text-6xl mb-4 opacity-30">🅿</div>
                  <p className="text-gray-300 font-semibold">No spots found</p>
                  <p className="text-gray-500 text-sm mt-1">Try a different city or clear the filter</p>
                  <motion.button whileHover={{ scale: 1.05 }} onClick={() => fetchSpots({})}
                    className="mt-4 px-5 py-2 rounded-xl text-purple-300 text-sm font-medium transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
                    Show all spots
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── ANALYTICS TAB ─── */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              <div>
                <h2 className="text-2xl font-black text-white">Analytics</h2>
                <p className="text-gray-400 text-sm mt-0.5">Your parking activity at a glance</p>
              </div>

              {/* Summary stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={FiClock} label="Active Sessions" value={analytics?.activeReservations ?? 0} gradient="linear-gradient(135deg,#06b6d4,#3b82f6)" delay={0} />
                <StatCard icon={FiTruck} label="Total Parkings" value={analytics?.totalParkings ?? 0} gradient="linear-gradient(135deg,#10b981,#059669)" delay={0.05} />
                <StatCard icon={FiBarChart2} label="Avg Duration" value={analytics?.avgDuration ?? '0h'} gradient="linear-gradient(135deg,#8b5cf6,#6366f1)" delay={0.1} />
                <StatCard icon={FiAward} label="Total Spent" value={`$${analytics?.totalSpent?.toFixed(2) ?? '0.00'}`} gradient="linear-gradient(135deg,#f59e0b,#ef4444)" delay={0.15} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-6">Weekly Sessions</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#fff' }} />
                      <Bar dataKey="sessions" fill="url(#purpleBar2)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="purpleBar2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-6">Parking Hours Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, color: '#fff' }} />
                      <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session history table */}
              <div className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-white font-bold text-lg mb-5">Session History</h3>
                {sessionHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          {['Date', 'Spot', 'Duration', 'Cost', 'Status'].map(h => (
                            <th key={h} className="pb-3 text-left text-gray-400 text-xs font-medium pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessionHistory.map((s, i) => (
                          <tr key={s._id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="py-3 pr-4 text-gray-300 text-xs whitespace-nowrap">
                              {new Date(s.startTime).toLocaleDateString()}
                            </td>
                            <td className="py-3 pr-4 text-white font-medium">{s.spotId?.name || '—'}</td>
                            <td className="py-3 pr-4 text-gray-300">{s.duration ? `${s.duration.toFixed(1)}h` : '—'}</td>
                            <td className="py-3 pr-4 text-white font-semibold">${s.amount?.toFixed(2) || '0.00'}</td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                                style={{
                                  background: s.status === 'completed' ? 'rgba(16,185,129,0.15)' : s.status === 'active' ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: s.status === 'completed' ? '#34d399' : s.status === 'active' ? '#818cf8' : '#f87171'
                                }}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400 text-sm">No session history yet. Start parking to see your data!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── LOYALTY TAB ─── */}
          {activeTab === 'loyalty' && (
            <motion.div key="loyalty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              <div>
                <h2 className="text-2xl font-black text-white">Loyalty Program</h2>
                <p className="text-gray-400 text-sm mt-0.5">Earn points every time you park</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tier card */}
                <motion.div whileHover={{ y: -4 }} className="rounded-2xl p-8 text-center"
                  style={{ background: `radial-gradient(ellipse at top, ${tierColor}20 0%, rgba(255,255,255,0.04) 70%)`, backdropFilter: 'blur(12px)', border: `1px solid ${tierColor}40` }}>
                  <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}
                    className="w-28 h-28 rounded-full mx-auto flex items-center justify-center text-5xl mb-5"
                    style={{ background: `radial-gradient(circle, ${tierColor}40, ${tierColor}10)`, border: `3px solid ${tierColor}70` }}>
                    {loyalty?.tier === 'bronze' ? '🥉' : loyalty?.tier === 'silver' ? '🥈' : loyalty?.tier === 'gold' ? '🥇' : '🏆'}
                  </motion.div>
                  <p className="text-white font-black text-3xl capitalize">{loyalty?.tier || 'Bronze'}</p>
                  <p className="text-4xl font-black mt-2" style={{ color: tierColor }}>{loyalty?.points || 0}</p>
                  <p className="text-gray-400 text-sm">total points</p>
                </motion.div>

                {/* Progress + info */}
                <div className="lg:col-span-2 rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-6">Progress to Next Tier</h3>
                  <div className="space-y-6">
                    {[
                      { tier: 'Bronze', min: 0, max: 1000, color: '#cd7f32' },
                      { tier: 'Silver', min: 1000, max: 5000, color: '#9ca3af' },
                      { tier: 'Gold', min: 5000, max: 15000, color: '#f59e0b' },
                      { tier: 'Platinum', min: 15000, max: 15000, color: '#8b5cf6' },
                    ].map(t => {
                      const pts = loyalty?.points || 0
                      const isCurrent = loyalty?.tier?.toLowerCase() === t.tier.toLowerCase()
                      const pct = t.tier === 'Platinum' ? (pts >= 15000 ? 100 : 0) : Math.min(100, Math.max(0, ((pts - t.min) / (t.max - t.min)) * 100))
                      return (
                        <div key={t.tier}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{t.tier === 'Bronze' ? '🥉' : t.tier === 'Silver' ? '🥈' : t.tier === 'Gold' ? '🥇' : '🏆'}</span>
                              <span className="font-semibold" style={{ color: isCurrent ? t.color : '#9ca3af' }}>{t.tier}</span>
                              {isCurrent && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${t.color}20`, color: t.color }}>Current</span>}
                            </div>
                            <span className="text-gray-400 text-xs">{t.tier === 'Platinum' ? '15,000+' : `${t.min.toLocaleString()} – ${t.max.toLocaleString()}`} pts</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.color}, #a855f7)` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 p-4 rounded-xl"
                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <p className="text-purple-300 text-sm font-medium">💡 Earn 10 points for every $1 spent on parking</p>
                    <p className="text-gray-400 text-xs mt-1">Upgrade your plan to earn bonus multipliers</p>
                  </div>

                  <Link to="/payment">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="mt-4 w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
                      <FiCreditCard size={15} /> Upgrade Plan for 2× Points
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}

export default Dashboard
