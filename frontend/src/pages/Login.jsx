import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi'
import { AuthContext } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'

// Floating particle for animated background
const Particle = ({ style }) => (
  <motion.div
    className="absolute rounded-full bg-white/10 backdrop-blur-sm"
    animate={{ y: [0, -30, 0], x: [0, 10, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: style.duration, repeat: Infinity, delay: style.delay, ease: 'easeInOut' }}
    style={style}
  />
)

const particles = Array.from({ length: 12 }, (_, i) => ({
  width: `${20 + (i * 17) % 60}px`,
  height: `${20 + (i * 17) % 60}px`,
  top: `${(i * 31) % 90}%`,
  left: `${(i * 23) % 90}%`,
  duration: 3 + (i % 4),
  delay: i * 0.4,
}))

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading, error } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email'
    if (!formData.password) errs.password = 'Password is required'
    else if (formData.password.length < 8) errs.password = 'Password must be at least 8 characters'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    try {
      await login(formData.email, formData.password)
      toast.success('Welcome back! 🚗')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Animated background particles */}
      {particles.map((p, i) => <Particle key={i} style={p} />)}

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-5xl mx-4 flex rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/20"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-white/10"
          />
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-6xl mb-4">🚗</motion.div>
            <h1 className="text-3xl font-black text-white leading-tight">Parking<br /><span className="text-yellow-300">Pro</span></h1>
            <p className="text-purple-200 mt-3 text-sm leading-relaxed">The smartest way to manage parking. Secure, fast, and rewarding.</p>
          </div>
          <div className="relative z-10 space-y-4">
            {[{ icon: '⚡', text: 'Instant reservations' }, { icon: '🔒', text: 'Bank-grade security' }, { icon: '🏆', text: 'Earn loyalty rewards' }].map((f, i) => (
              <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.15 }}
                className="flex items-center gap-3 text-white/90">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 p-10 flex flex-col justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-8">
              <FiShield className="text-purple-400" size={20} />
              <span className="text-purple-300 text-sm font-medium">Secured with 256-bit SSL</span>
            </div>

            <h2 className="text-3xl font-black text-white mb-2">Welcome back</h2>
            <p className="text-gray-400 mb-8">Sign in to your account to continue</p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                    onBlur={e => e.target.style.border = errors.email ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 text-sm font-medium">Password</label>
                  <Link to="/forgot-password" className="text-purple-400 text-xs hover:text-purple-300 transition">Forgot password?</Link>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: errors.password ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                    onBlur={e => e.target.style.border = errors.password ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition">
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>}
              </div>

              {/* Submit */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all mt-2"
                style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
                {loading ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />Signing in...</>
                ) : (
                  <>Sign In <FiArrowRight size={18} /></>
                )}
              </motion.button>
            </form>

            <p className="text-center text-gray-400 text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition">Create one free →</Link>
            </p>
            <p className="text-center mt-2">
              <Link to="/admin-setup" className="text-red-400/50 hover:text-red-400 text-xs transition">
                🛡️ First time setup? Create admin account
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login

