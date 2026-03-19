import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiShield, FiUser, FiMail, FiLock, FiPhone,
  FiKey, FiArrowRight, FiEye, FiEyeOff, FiCheckCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../services/api'

const GLS = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
}
const INPUT = (hasError) => ({
  background: 'rgba(255,255,255,0.07)',
  border: `1px solid ${hasError ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
  color: '#fff',
})

export default function AdminSetup() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', setupSecret: '',
  })
  const [showPwd, setShowPwd]         = useState(false)
  const [showSecret, setShowSecret]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState({})
  const [done, setDone]               = useState(false)

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim())  e.firstName  = 'Required'
    if (!form.lastName.trim())   e.lastName   = 'Required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required'
    if (!form.phone.trim())      e.phone      = 'Required'
    if (form.password.length < 8) e.password  = 'Min 8 characters'
    if (!form.setupSecret.trim()) e.setupSecret = 'Setup secret required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await api.post('/admin/setup', form)
      // Persist auth state and force reload so AuthProvider picks it up
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setDone(true)
      toast.success('Admin account created! 🛡️')
      setTimeout(() => { window.location.replace('/admin') }, 1400)
    } catch (err) {
      const msg = err.response?.data?.message || 'Setup failed'
      toast.error(msg)
      if (msg.toLowerCase().includes('already exists')) {
        setTimeout(() => { window.location.replace('/login') }, 1800)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)' }}>

      {/* Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#ef4444,transparent)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }} />

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10 rounded-3xl overflow-hidden" style={GLS}>
        <div className="p-8">

          {/* Success state */}
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl z-20"
                style={{ background: 'rgba(15,12,41,0.97)' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 40px rgba(239,68,68,0.5)' }}>
                  <FiCheckCircle size={36} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-white mb-2">Admin Created!</h2>
                <p className="text-gray-400 text-sm">Redirecting to Admin Panel…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="text-center mb-7">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 28px rgba(239,68,68,0.35)' }}>
              <FiShield size={24} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-black text-white">Admin Setup</h1>
            <p className="text-gray-400 text-sm mt-1">Create the first administrator account</p>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              🔒 One-time setup · Disabled after first admin is created
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([k, ph]) => (
                <div key={k}>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                    <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                      className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                      style={INPUT(!!errors[k])} />
                  </div>
                  {errors[k] && <p className="text-red-400 text-xs mt-1">{errors[k]}</p>}
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={INPUT(!!errors.email)} />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="Phone number"
                  className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={INPUT(!!errors.phone)} />
              </div>
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                <input type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)} placeholder="Password (min 8 chars)"
                  className="w-full pl-9 pr-10 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={INPUT(!!errors.password)} />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition">
                  {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Setup Secret */}
            <div>
              <div className="relative">
                <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={14} />
                <input type={showSecret ? 'text' : 'password'} value={form.setupSecret}
                  onChange={e => set('setupSecret', e.target.value)} placeholder="Admin setup secret key"
                  className="w-full pl-9 pr-10 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={INPUT(!!errors.setupSecret)} />
                <button type="button" onClick={() => setShowSecret(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition">
                  {showSecret ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {errors.setupSecret && <p className="text-red-400 text-xs mt-1">{errors.setupSecret}</p>}
              <p className="text-gray-500 text-xs mt-1.5">
                Set <code className="text-red-300 bg-red-900/20 px-1 rounded">ADMIN_SETUP_SECRET</code> in{' '}
                <code className="text-gray-300">backend/.env</code> · Default: <code className="text-yellow-400/70">admin@setup123</code>
              </p>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? '#7f1d1d' : 'linear-gradient(135deg,#ef4444,#dc2626,#b91c1c)',
                boxShadow: '0 0 28px rgba(239,68,68,0.35)',
              }}>
              {loading
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Creating admin…</>
                : <><FiShield size={17} /> Create Admin Account <FiArrowRight size={15} /></>
              }
            </motion.button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an admin account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">Sign in →</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
