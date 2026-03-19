import React, { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi'
import { AuthContext } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'

const Particle = ({ style }) => (
  <motion.div
    className="absolute rounded-full bg-white/10"
    animate={{ y: [0, -25, 0], x: [0, 8, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: style.duration, repeat: Infinity, delay: style.delay, ease: 'easeInOut' }}
    style={style}
  />
)

const particles = Array.from({ length: 10 }, (_, i) => ({
  width: `${18 + (i * 19) % 55}px`,
  height: `${18 + (i * 19) % 55}px`,
  top: `${(i * 37) % 90}%`,
  left: `${(i * 29) % 90}%`,
  duration: 3 + (i % 4),
  delay: i * 0.35,
}))

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirm: ''
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const { register, loading, error } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.firstName.trim()) errs.firstName = 'First name is required'
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required'
    if (!formData.email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email'
    if (!formData.phone) errs.phone = 'Phone is required'
    if (!formData.password) errs.password = 'Password is required'
    else if (formData.password.length < 8) errs.password = 'Minimum 8 characters'
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      errs.password = 'Must contain uppercase, lowercase & number'
    if (!formData.passwordConfirm) errs.passwordConfirm = 'Please confirm'
    else if (formData.password !== formData.passwordConfirm) errs.passwordConfirm = 'Passwords do not match'
    if (!acceptTerms) errs.terms = 'You must accept the terms'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    try {
      await register(formData)
      toast.success('Account created! Please sign in. 🎉')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  const Field = ({ label, name, type = 'text', icon: Icon, placeholder, toggle, onToggle, showVal }) => (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
        <input
          type={toggle ? (showVal ? 'text' : 'password') : type}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.07)', border: errors[name] ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)' }}
          onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
          onBlur={e => e.target.style.border = errors[name] ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)'}
        />
        {toggle && (
          <button type="button" onClick={onToggle}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition">
            {showVal ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
      {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-8"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {particles.map((p, i) => <Particle key={i} style={p} />)}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-5xl mx-4 flex rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between w-2/5 p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-white/20" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full border border-white/10" />
          <div className="relative z-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
              className="text-6xl mb-4">🚗</motion.div>
            <h1 className="text-3xl font-black text-white leading-tight">Join<br /><span className="text-yellow-300">Parking Pro</span></h1>
            <p className="text-purple-200 mt-3 text-sm leading-relaxed">Set up your account in under a minute. Park smarter, earn rewards, save time.</p>
          </div>
          <div className="relative z-10 space-y-4">
            {[
              { icon: '🎁', text: 'Free 50 welcome bonus points' },
              { icon: '🔒', text: 'Your data is fully encrypted' },
              { icon: '🚀', text: 'Go live in under 60 seconds' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.15 }} className="flex items-center gap-3 text-white/90">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-10 flex flex-col justify-center overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-6">
              <FiShield className="text-purple-400" size={18} />
              <span className="text-purple-300 text-sm font-medium">256-bit SSL Encrypted</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-1">Create account</h2>
            <p className="text-gray-400 text-sm mb-6">Fill in your details to get started</p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" name="firstName" icon={FiUser} placeholder="John" />
                <Field label="Last Name" name="lastName" icon={FiUser} placeholder="Doe" />
              </div>
              <Field label="Email Address" name="email" type="email" icon={FiMail} placeholder="you@example.com" />
              <Field label="Phone Number" name="phone" type="tel" icon={FiPhone} placeholder="+1 (555) 000-0000" />
              <Field label="Password" name="password" icon={FiLock} placeholder="Min 8 chars, upper + number"
                toggle onToggle={() => setShowPassword(!showPassword)} showVal={showPassword} />
              <Field label="Confirm Password" name="passwordConfirm" icon={FiLock} placeholder="Repeat your password"
                toggle onToggle={() => setShowConfirmPassword(!showConfirmPassword)} showVal={showConfirmPassword} />

              <div>
                <label className="flex items-start gap-3 cursor-pointer mt-1">
                  <div className="relative mt-0.5">
                    <div onClick={() => setAcceptTerms(!acceptTerms)}
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                      style={{ background: acceptTerms ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {acceptTerms && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">
                    I agree to the{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition">Privacy Policy</a>
                  </span>
                </label>
                {errors.terms && <p className="text-red-400 text-xs mt-1">{errors.terms}</p>}
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
                {loading ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />Creating account...</>
                ) : (
                  <>Create Free Account <FiArrowRight size={18} /></>
                )}
              </motion.button>
            </form>

            <p className="text-center text-gray-400 text-sm mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">Sign in →</Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register
