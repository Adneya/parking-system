import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiCreditCard, FiLock, FiCheck, FiArrowLeft, FiShield, FiZap,
  FiSmartphone, FiRefreshCw, FiCopy, FiCheckCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../services/api'

// ─── Plans ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'basic', name: 'Basic', price: 9.99, icon: '🚗',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    features: ['Up to 2 vehicles', 'Standard support', '5% loyalty bonus', 'Basic analytics'],
  },
  {
    id: 'premium', name: 'Premium', price: 29.99, icon: '⭐', popular: true,
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    features: ['Up to 5 vehicles', 'Priority support', '15% loyalty bonus', 'Advanced analytics', 'Reserved spots', 'No peak surcharge'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 99.99, icon: '🏆',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    features: ['Unlimited vehicles', 'Dedicated support', '30% loyalty bonus', 'Full analytics suite', 'Fleet management', 'Custom billing'],
  },
]

// ─── Card helpers ────────────────────────────────────────────────────────────

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
const getCardBrand = (n) => {
  const c = n.replace(/\s/g, '')
  if (/^4/.test(c)) return '💳 Visa'
  if (/^5[1-5]/.test(c)) return '💳 Mastercard'
  if (/^3[47]/.test(c)) return '💳 Amex'
  if (/^6/.test(c)) return '💳 RuPay'
  return '💳'
}

// ─── UPI Apps ────────────────────────────────────────────────────────────────

const UPI_APPS = [
  { name: 'GPay',       logo: '🟢', color: '#4285f4' },
  { name: 'PhonePe',    logo: '🟣', color: '#5f259f' },
  { name: 'Paytm',      logo: '🔵', color: '#00b9f1' },
  { name: 'BHIM',       logo: '🟠', color: '#ef4444' },
  { name: 'Amazon Pay', logo: '🟡', color: '#ff9900' },
  { name: 'CRED',       logo: '⚫', color: '#1a1a1a' },
]

// ─── Shared input style ───────────────────────────────────────────────────────

const iStyle = (err) => ({
  background: 'rgba(255,255,255,0.07)',
  border: err ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
})

// ════════════════════════════════════════════════════════════════════════════
// Payment component
// ════════════════════════════════════════════════════════════════════════════

const Payment = () => {
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [step, setStep]       = useState('plans')   // 'plans' | 'checkout' | 'success'
  const [payMethod, setPayMethod] = useState('card') // 'card' | 'upi' | 'qr'
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState(null)

  // Card state
  const [card, setCard]     = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState({})

  // UPI state
  const [upiId, setUpiId]         = useState('')
  const [upiIdError, setUpiIdError] = useState('')
  const [upiData, setUpiData]     = useState(null)  // { txnRef, qrDataUrl, vpa, amountRupees }
  const [utrNumber, setUtrNumber] = useState('')
  const [utrError, setUtrError]   = useState('')
  const [upiStep, setUpiStep]     = useState('form') // 'form' | 'scan' | 'verify'

  // QR state
  const [qrData, setQrData]       = useState(null)  // { txnRef, qrDataUrl, vpa, amountRupees }
  const [qrUtr, setQrUtr]         = useState('')
  const [qrUtrError, setQrUtrError] = useState('')
  const [qrStep, setQrStep]       = useState('idle') // 'idle' | 'generated' | 'verify'
  const [copied, setCopied]       = useState(false)

  const navigate = useNavigate()
  const plan = PLANS.find(p => p.id === selectedPlan)
  const amountINR = plan ? (plan.price * 83).toFixed(0) : '0'

  // ── Card handlers ───────────────────────────────────────────────────────────

  const handleCardChange = (e) => {
    let { name, value } = e.target
    if (name === 'number') value = formatCard(value)
    if (name === 'expiry') value = formatExpiry(value)
    if (name === 'cvv')    value = value.replace(/\D/g, '').slice(0, 4)
    setCard(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateCard = () => {
    const errs = {}
    if (!card.name.trim()) errs.name = 'Cardholder name is required'
    const clean = card.number.replace(/\s/g, '')
    if (!clean || clean.length !== 16) errs.number = 'Enter a valid 16-digit card number'
    if (!card.expiry || card.expiry.length < 5) errs.expiry = 'Enter a valid expiry (MM/YY)'
    if (!card.cvv || card.cvv.length < 3) errs.cvv = 'Enter a valid CVV'
    return errs
  }

  const handleCardPayment = async (e) => {
    e.preventDefault()
    const errs = validateCard()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const [month, year] = card.expiry.split('/')
      const res = await api.post('/payments/simulate', {
        plan: selectedPlan,
        cardNumber: card.number,
        cardholderName: card.name,
        expiryMonth: month,
        expiryYear: `20${year}`,
        cvv: card.cvv,
      })
      setTransaction(res.data.transaction)
      setStep('success')
      toast.success('Payment successful! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Card payment failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── UPI handlers ────────────────────────────────────────────────────────────

  const handleInitiateUpi = async () => {
    if (!upiId.trim() || !upiId.includes('@')) { setUpiIdError('Enter a valid UPI ID (e.g. name@upi)'); return }
    setUpiIdError('')
    setLoading(true)
    try {
      const res = await api.post('/payments/upi/initiate', { plan: selectedPlan })
      setUpiData(res.data)
      setUpiStep('scan')
      toast.success('UPI QR generated! Scan with your UPI app.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate UPI payment.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyUpi = async () => {
    if (!utrNumber.trim() || utrNumber.length < 6) { setUtrError('Enter a valid UTR / Transaction ID (min 6 chars)'); return }
    setUtrError('')
    setLoading(true)
    try {
      const res = await api.post('/payments/upi/verify', { txnRef: upiData.txnRef, upiTransactionId: utrNumber })
      setTransaction({ id: utrNumber, method: 'UPI', amount: upiData.amountRupees, currency: 'INR', vpa: upiData.vpa, timestamp: Date.now() })
      setStep('success')
      toast.success('UPI payment verified! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.message || 'UPI verification failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── QR handlers ─────────────────────────────────────────────────────────────

  const handleGenerateQr = async () => {
    setLoading(true)
    try {
      const res = await api.post('/payments/qr/generate', { plan: selectedPlan })
      setQrData(res.data)
      setQrStep('generated')
      toast.success('QR code generated! Scan to pay.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate QR code.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyQr = async () => {
    if (!qrUtr.trim() || qrUtr.length < 6) { setQrUtrError('Enter a valid UTR / Transaction ID (min 6 chars)'); return }
    setQrUtrError('')
    setLoading(true)
    try {
      await api.post('/payments/upi/verify', { txnRef: qrData.txnRef, upiTransactionId: qrUtr })
      setTransaction({ id: qrUtr, method: 'QR Code / UPI', amount: qrData.amountRupees, currency: 'INR', vpa: qrData.vpa, timestamp: Date.now() })
      setStep('success')
      toast.success('Payment verified! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.message || 'QR payment verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const copyUpiId = (vpa) => {
    navigator.clipboard.writeText(vpa).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const switchMethod = (m) => {
    setPayMethod(m)
    setUpiStep('form'); setUpiId(''); setUpiIdError(''); setUpiData(null); setUtrNumber(''); setUtrError('')
    setQrStep('idle'); setQrData(null); setQrUtr(''); setQrUtrError('')
  }

  const inputStyle = (hasError) => ({
    background: 'rgba(255,255,255,0.07)',
    border: hasError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
  })

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Background orbs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="fixed bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => step === 'checkout' ? setStep('plans') : navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-sm">
          <FiArrowLeft size={18} />
          {step === 'checkout' ? 'Back to Plans' : 'Dashboard'}
        </motion.button>
        <div className="flex items-center gap-2 ml-2">
          <FiShield className="text-green-400" size={16} />
          <span className="text-green-400 text-xs font-medium">256-bit SSL Encrypted</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── STEP 1: Plan Selection ── */}
        <AnimatePresence mode="wait">
          {step === 'plans' && (
            <motion.div key="plans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">Choose Your Plan</h1>
                <p className="text-gray-400">Unlock premium parking benefits. Cancel anytime.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {PLANS.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -6 }}
                    onClick={() => setSelectedPlan(p.id)}
                    className="relative rounded-2xl p-6 cursor-pointer transition-all"
                    style={{
                      background: selectedPlan === p.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(12px)',
                      border: selectedPlan === p.id ? '2px solid rgba(139,92,246,0.6)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: selectedPlan === p.id ? '0 0 30px rgba(139,92,246,0.2)' : 'none',
                    }}>
                    {p.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                        ⭐ Most Popular
                      </div>
                    )}
                    <div className="text-5xl mb-4">{p.icon}</div>
                    <h3 className="text-white font-black text-xl mb-1">{p.name}</h3>
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-white font-black text-3xl">${p.price}</span>
                      <span className="text-gray-400 text-sm mb-1">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {p.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                          <FiCheck className="text-green-400 flex-shrink-0" size={14} /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all`}
                      style={{
                        borderColor: selectedPlan === p.id ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                        background: selectedPlan === p.id ? '#8b5cf6' : 'transparent',
                      }}>
                      {selectedPlan === p.id && <FiCheck className="text-white" size={12} />}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep('checkout')}
                  className="px-10 py-4 rounded-xl font-bold text-white text-lg flex items-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}>
                  <FiCreditCard size={20} /> Continue to Payment — ${plan?.price}/mo
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Checkout ── */}
          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">

              {/* Left: Method Selector + Form */}
              <div className="lg:col-span-3 rounded-2xl p-8"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>

                <h2 className="text-white font-black text-2xl mb-2">Secure Checkout</h2>
                <p className="text-gray-400 text-sm mb-6">Your payment is protected by 256-bit SSL encryption</p>

                {/* Payment Method Tabs */}
                <div className="flex gap-2 mb-7 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {[
                    { id: 'card', label: 'Card', icon: <FiCreditCard size={16} /> },
                    { id: 'upi',  label: 'UPI',  icon: <FiSmartphone size={16} /> },
                    { id: 'qr',   label: 'QR Code', icon: <FiZap size={16} /> },
                  ].map(m => (
                    <button key={m.id} onClick={() => switchMethod(m.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: payMethod === m.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                        color: payMethod === m.id ? '#fff' : '#9ca3af',
                        boxShadow: payMethod === m.id ? '0 0 20px rgba(139,92,246,0.3)' : 'none',
                      }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {/* ── Card Form ── */}
                {payMethod === 'card' && (
                  <>
                    {/* Mock card visual */}
                    <motion.div animate={{ rotateY: card.number ? 2 : 0 }}
                      className="rounded-2xl p-6 mb-7 relative overflow-hidden"
                      style={{ background: plan?.gradient, minHeight: 160 }}>
                      <div className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 bg-white/10" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full translate-y-1/2 -translate-x-1/2 bg-white/10" />
                      <p className="text-white/60 text-xs font-mono mb-6 relative z-10">CREDIT / DEBIT CARD</p>
                      <p className="text-white text-xl font-mono tracking-widest relative z-10 mb-4">
                        {card.number || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex justify-between relative z-10">
                        <div>
                          <p className="text-white/50 text-xs">CARDHOLDER</p>
                          <p className="text-white text-sm font-semibold">{card.name || 'YOUR NAME'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/50 text-xs">EXPIRES</p>
                          <p className="text-white text-sm font-semibold">{card.expiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </motion.div>

                    <form onSubmit={handleCardPayment} className="space-y-4">
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1.5">
                          Card Number {card.number && <span className="text-purple-400 ml-2 text-xs">{getCardBrand(card.number)}</span>}
                        </label>
                        <div className="relative">
                          <FiCreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                          <input name="number" value={card.number} onChange={handleCardChange} placeholder="1234 5678 9012 3456"
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none font-mono transition-all"
                            style={inputStyle(errors.number)}
                            onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                            onBlur={e => e.target.style.border = errors.number ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                          />
                        </div>
                        {errors.number && <p className="text-red-400 text-xs mt-1">{errors.number}</p>}
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm font-medium mb-1.5">Cardholder Name</label>
                        <input name="name" value={card.name} onChange={handleCardChange} placeholder="John Doe"
                          className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                          style={inputStyle(errors.name)}
                          onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                          onBlur={e => e.target.style.border = errors.name ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-1.5">Expiry Date</label>
                          <input name="expiry" value={card.expiry} onChange={handleCardChange} placeholder="MM/YY"
                            className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none font-mono transition-all"
                            style={inputStyle(errors.expiry)}
                            onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                            onBlur={e => e.target.style.border = errors.expiry ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                          />
                          {errors.expiry && <p className="text-red-400 text-xs mt-1">{errors.expiry}</p>}
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm font-medium mb-1.5">CVV</label>
                          <div className="relative">
                            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={14} />
                            <input name="cvv" value={card.cvv} onChange={handleCardChange} placeholder="•••"
                              type="password" maxLength={4}
                              className="w-full pl-9 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none font-mono transition-all"
                              style={inputStyle(errors.cvv)}
                              onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                              onBlur={e => e.target.style.border = errors.cvv ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                            />
                          </div>
                          {errors.cvv && <p className="text-red-400 text-xs mt-1">{errors.cvv}</p>}
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                        className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 mt-2"
                        style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
                        {loading
                          ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Processing...</>
                          : <><FiLock size={18} /> Pay ${plan?.price} Securely</>
                        }
                      </motion.button>
                    </form>
                  </>
                )}

                {/* ── UPI Form ── */}
                {payMethod === 'upi' && (
                  <div>
                    {/* UPI App Icons */}
                    <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Pay via</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {UPI_APPS.map(app => (
                        <div key={app.name} className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all cursor-default"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <span className="text-2xl">{app.logo}</span>
                          <span className="text-gray-300 text-xs">{app.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sub-step: form */}
                    {upiStep === 'form' && (
                      <>
                        <label className="block text-gray-300 text-sm font-medium mb-1.5">Your UPI ID</label>
                        <div className="relative mb-2">
                          <FiSmartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                          <input value={upiId} onChange={e => { setUpiId(e.target.value); setUpiIdError('') }}
                            placeholder="yourname@upi"
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                            style={iStyle(upiIdError)}
                            onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                            onBlur={e => e.target.style.border = upiIdError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                          />
                        </div>
                        {upiIdError && <p className="text-red-400 text-xs mb-3">{upiIdError}</p>}
                        <p className="text-gray-500 text-xs mb-5">We'll generate a QR code for your UPI ID to scan and pay ₹{amountINR}</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleInitiateUpi} disabled={loading}
                          className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3"
                          style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
                          {loading
                            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Generating QR...</>
                            : <><FiSmartphone size={18} /> Generate QR & Pay ₹{amountINR}</>
                          }
                        </motion.button>
                      </>
                    )}

                    {/* Sub-step: scan */}
                    {upiStep === 'scan' && upiData && (
                      <div className="text-center">
                        <div className="inline-block p-3 rounded-2xl mb-4"
                          style={{ background: '#fff', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
                          <img src={upiData.qrDataUrl} alt="UPI QR" className="w-48 h-48" />
                        </div>
                        <p className="text-white font-semibold mb-1">Scan with any UPI app</p>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-gray-400 text-sm font-mono">{upiData.vpa}</span>
                          <button onClick={() => copyUpiId(upiData.vpa)} className="text-purple-400 hover:text-purple-300 transition-colors">
                            {copied ? <FiCheckCircle size={14} /> : <FiCopy size={14} />}
                          </button>
                        </div>
                        <p className="text-purple-300 font-bold text-lg mb-5">₹{upiData.amountRupees}</p>
                        <button onClick={() => setUpiStep('verify')}
                          className="px-6 py-3 rounded-xl font-semibold text-white transition-all text-sm"
                          style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)' }}>
                          I've Paid — Enter UTR
                        </button>
                      </div>
                    )}

                    {/* Sub-step: verify */}
                    {upiStep === 'verify' && (
                      <>
                        <p className="text-gray-300 text-sm mb-4">Enter the UTR / Transaction ID from your UPI app's payment history.</p>
                        <label className="block text-gray-300 text-sm font-medium mb-1.5">UTR / Transaction ID</label>
                        <div className="relative mb-2">
                          <FiRefreshCw className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                          <input value={utrNumber} onChange={e => { setUtrNumber(e.target.value); setUtrError('') }}
                            placeholder="12-digit UTR or transaction ID"
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                            style={iStyle(utrError)}
                            onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                            onBlur={e => e.target.style.border = utrError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                          />
                        </div>
                        {utrError && <p className="text-red-400 text-xs mb-3">{utrError}</p>}
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleVerifyUpi} disabled={loading}
                          className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3"
                          style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                          {loading
                            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Verifying...</>
                            : <><FiCheckCircle size={18} /> Verify & Confirm Payment</>
                          }
                        </motion.button>
                        <button onClick={() => setUpiStep('scan')} className="w-full mt-2 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                          ← Back to QR
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ── QR Code Form ── */}
                {payMethod === 'qr' && (
                  <div>
                    {/* Idle: generate button */}
                    {qrStep === 'idle' && (
                      <div className="text-center py-4">
                        <div className="w-24 h-24 rounded-2xl mx-auto flex items-center justify-center mb-5"
                          style={{ background: 'rgba(99,102,241,0.15)', border: '2px dashed rgba(99,102,241,0.4)' }}>
                          <FiZap className="text-indigo-400" size={36} />
                        </div>
                        <p className="text-white font-semibold mb-2">Pay via QR Code</p>
                        <p className="text-gray-400 text-sm mb-6">Generate a unique QR code and scan it with any UPI-enabled app to pay ₹{amountINR}</p>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleGenerateQr} disabled={loading}
                          className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3"
                          style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
                          {loading
                            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Generating...</>
                            : <><FiZap size={18} /> Generate QR Code</>
                          }
                        </motion.button>
                      </div>
                    )}

                    {/* Generated: show QR */}
                    {(qrStep === 'generated' || qrStep === 'verify') && qrData && (
                      <div>
                        <div className="text-center mb-5">
                          <div className="inline-block p-3 rounded-2xl mb-3"
                            style={{ background: '#fff', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
                            <img src={qrData.qrDataUrl} alt="Payment QR" className="w-48 h-48" />
                          </div>
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-gray-400 text-sm font-mono">{qrData.vpa}</span>
                            <button onClick={() => copyUpiId(qrData.vpa)} className="text-purple-400 hover:text-purple-300">
                              {copied ? <FiCheckCircle size={14} /> : <FiCopy size={14} />}
                            </button>
                          </div>
                          <p className="text-purple-300 font-bold text-lg">₹{qrData.amountRupees}</p>
                        </div>

                        {qrStep === 'generated' && (
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setQrStep('verify')}
                            className="w-full py-3 rounded-xl font-semibold text-white"
                            style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)' }}>
                            I've Paid — Enter UTR
                          </motion.button>
                        )}

                        {qrStep === 'verify' && (
                          <>
                            <label className="block text-gray-300 text-sm font-medium mb-1.5">UTR / Transaction ID</label>
                            <div className="relative mb-2">
                              <FiRefreshCw className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                              <input value={qrUtr} onChange={e => { setQrUtr(e.target.value); setQrUtrError('') }}
                                placeholder="12-digit UTR or transaction ID"
                                className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all"
                                style={iStyle(qrUtrError)}
                                onFocus={e => e.target.style.border = '1px solid #8b5cf6'}
                                onBlur={e => e.target.style.border = qrUtrError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)'}
                              />
                            </div>
                            {qrUtrError && <p className="text-red-400 text-xs mb-3">{qrUtrError}</p>}
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={handleVerifyQr} disabled={loading}
                              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-3"
                              style={{ background: loading ? '#4c1d95' : 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                              {loading
                                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Verifying...</>
                                : <><FiCheckCircle size={18} /> Verify & Confirm Payment</>
                              }
                            </motion.button>
                            <button onClick={() => setQrStep('generated')} className="w-full mt-2 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                              ← Back to QR
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Order Summary */}
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl p-6"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold text-lg mb-5">Order Summary</h3>
                  <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: plan?.gradient }}>{plan?.icon}</div>
                    <div>
                      <p className="text-white font-bold">{plan?.name} Plan</p>
                      <p className="text-gray-400 text-sm">Monthly subscription</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm mb-5">
                    <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">${plan?.price}</span></div>
                    {(payMethod === 'upi' || payMethod === 'qr') && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount (INR)</span>
                        <span className="text-purple-300 font-semibold">₹{amountINR}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-400">Tax</span><span className="text-white">$0.00</span></div>
                    <div className="flex justify-between text-base font-bold pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <span className="text-white">Total</span>
                      <span className="text-purple-400">
                        {payMethod === 'card' ? `$${plan?.price}/mo` : `₹${amountINR}/mo`}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {plan?.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300 text-xs">
                        <FiCheck className="text-green-400 flex-shrink-0" size={12} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl p-5 text-center"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <FiShield className="text-green-400 mx-auto mb-2" size={22} />
                  <p className="text-green-400 text-sm font-medium">Money-back guarantee</p>
                  <p className="text-gray-400 text-xs mt-1">Cancel within 7 days for a full refund</p>
                </div>

                <div className="rounded-2xl p-5 text-center"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <FiZap className="text-indigo-400 mx-auto mb-2" size={22} />
                  <p className="text-indigo-300 text-sm font-medium">Instant Activation</p>
                  <p className="text-gray-400 text-xs mt-1">Your plan activates immediately after payment</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} className="max-w-md mx-auto text-center py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl mb-6"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
                ✓
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2">Payment Successful!</h2>
              <p className="text-gray-400 mb-8">Your <span className="text-purple-400 font-bold">{plan?.name}</span> plan is now active.</p>

              {transaction && (
                <div className="rounded-2xl p-6 text-left mb-8 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-white font-bold mb-4 text-center">Transaction Details</h3>
                  {transaction.method === 'UPI' || transaction.method === 'QR Code / UPI' ? (
                    <>
                      {[
                        ['Method',         transaction.method],
                        ['UTR / Txn ID',   transaction.id],
                        ['Amount',         `₹${transaction.amount}`],
                        ['Paid to (VPA)',  transaction.vpa],
                        ['Status',         'Verified ✓'],
                        ['Date',           new Date(transaction.timestamp).toLocaleString()],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-gray-400">{k}</span>
                          <span className="text-white font-medium">{v}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        ['Transaction ID', transaction.id],
                        ['Amount',         `$${(transaction.amount / 100).toFixed(2)}`],
                        ['Card',           `**** **** **** ${transaction.last4}`],
                        ['Status',         'Succeeded ✓'],
                        ['Date',           new Date(transaction.timestamp).toLocaleString()],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-gray-400">{k}</span>
                          <span className="text-white font-medium">{v}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}>
                Go to Dashboard →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Payment
