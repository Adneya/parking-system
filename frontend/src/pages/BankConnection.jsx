import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBank, FiCheck, FiX, FiArrowLeft, FiLock, FiPhone } from 'react-icons/fi'
import { AuthContext } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const BankConnection = () => {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [step, setStep] = useState('form') // 'form', 'otp', 'success', 'connected'
  const [loading, setLoading] = useState(false)
  const [bankAccount, setBankAccount] = useState(null)
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    accountType: 'savings',
    ifscCode: '',
    bankName: '',
    upiId: ''
  })
  const [otp, setOtp] = useState('')
  const [verificationToken, setVerificationToken] = useState('')

  // Load existing bank account on mount
  useEffect(() => {
    fetchBankAccount()
  }, [])

  const fetchBankAccount = async () => {
    try {
      const response = await api.get('/payments/bank/details')
      setBankAccount(response.data.bankAccount)
      setStep('connected')
    } catch (err) {
      // No connected account yet
      setStep('form')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.accountHolderName.trim()) return 'Account holder name is required'
    if (!formData.accountNumber.trim()) return 'Account number is required'
    if (!/^\d{9,18}$/.test(formData.accountNumber)) return 'Account number must be 9-18 digits'
    if (!formData.ifscCode.trim()) return 'IFSC code is required'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) return 'Invalid IFSC code format (e.g., HDFC0001234)'
    if (!formData.bankName.trim()) return 'Bank name is required'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validateForm()
    if (error) { toast.error(error); return }

    setLoading(true)
    try {
      const response = await api.post('/payments/bank/connect', formData)
      setVerificationToken(response.data.verificationToken)
      
      // In production: OTP sent via SMS/Email
      // For demo: show the OTP
      if (response.data.demo_otp) {
        toast.success(`Demo OTP: ${response.data.demo_otp}`)
      }
      
      setStep('otp')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit bank details')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/payments/bank/verify', {
        otp,
        verificationToken
      })
      setBankAccount(response.data.bankAccount)
      setStep('success')
      toast.success('Bank account verified successfully!')
      setTimeout(() => setStep('connected'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this bank account?')) return

    setLoading(true)
    try {
      await api.delete('/payments/bank/disconnect')
      setBankAccount(null)
      setFormData({
        accountHolderName: '',
        accountNumber: '',
        accountType: 'savings',
        ifscCode: '',
        bankName: '',
        upiId: ''
      })
      setStep('form')
      setOtp('')
      setVerificationToken('')
      toast.success('Bank account disconnected')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6"
        >
          <FiArrowLeft size={18} /> Back to Dashboard
        </motion.button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <FiBank size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Bank Account Connection</h1>
            <p className="text-gray-400 text-sm">Receive payments from QR codes and UPI</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Form Step */}
          {step === 'form' && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="rounded-2xl p-8 backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="space-y-6">
                {/* Account Holder Name */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    placeholder="Enter full name as per bank records"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Account Number</label>
                  <input
                    type="password"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter 9-18 digit account number"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Account Type</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="savings">Savings Account</option>
                    <option value="current">Current Account</option>
                  </select>
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">IFSC Code</label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={e => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g., HDFC0001234"
                    maxLength="11"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="e.g., HDFC Bank"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* UPI ID (Optional) */}
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">UPI ID (Optional)</label>
                  <input
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="e.g., yourname@upi"
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Security Note */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <FiLock size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">Your bank details are encrypted and securely stored. We never share them with third parties.</p>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Connect Bank Account'}
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <motion.form
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleOtpSubmit}
              className="rounded-2xl p-8 backdrop-blur-xl text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <FiPhone size={32} className="text-blue-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Verify Your Account</h2>
              <p className="text-gray-400 mb-8">Enter the 6-digit OTP sent to your registered phone number</p>

              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full text-center text-4xl font-bold tracking-widest px-4 py-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500 mb-8"
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 mb-4"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setStep('form')}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-gray-400 font-semibold rounded-lg transition-all"
              >
                Back
              </motion.button>
            </motion.form>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="rounded-2xl p-8 backdrop-blur-xl text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6"
              >
                <FiCheck size={40} className="text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">Account Verified!</h2>
              <p className="text-gray-400">Your bank account has been successfully connected.</p>
            </motion.div>
          )}

          {/* Connected Step */}
          {step === 'connected' && bankAccount && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl p-8 backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Connected Bank Account</h2>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <FiCheck size={20} className="text-green-400" />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">Account Holder</span>
                  <span className="text-white font-semibold">{bankAccount.accountHolderName}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">Account Number</span>
                  <span className="text-white font-mono">{bankAccount.accountNumber}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">Bank Name</span>
                  <span className="text-white font-semibold">{bankAccount.bankName}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">Account Type</span>
                  <span className="text-white capitalize font-semibold">{bankAccount.accountType}</span>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">IFSC Code</span>
                  <span className="text-white font-mono">{bankAccount.ifscCode}</span>
                </div>

                {bankAccount.upiId && (
                  <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                    <span className="text-gray-400">UPI ID</span>
                    <span className="text-white font-mono">{bankAccount.upiId}</span>
                  </div>
                )}

                <div className="flex justify-between items-center p-4 rounded-lg bg-white/10">
                  <span className="text-gray-400">Connected Since</span>
                  <span className="text-white">{new Date(bankAccount.connectedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 mb-8">
                <FiCheck size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">All payments from QR codes and UPI will be deposited to this account.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
                >
                  Back to Dashboard
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-all border border-red-500/30"
                >
                  {loading ? 'Disconnecting...' : 'Disconnect'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BankConnection
