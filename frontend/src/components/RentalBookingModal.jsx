import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCalendar, FiMapPin, FiDollarSign, FiCheck, FiAlertCircle, FiCopy } from 'react-icons/fi'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { createRentalBooking, checkRentalAvailability, confirmRentalPayment } from '../services/api'

const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }

function RentalBookingModal({ rental, onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1: dates, 2: details, 3: payment, 4: confirmation
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(null)
  
  const [dates, setDates] = useState({
    startDate: '',
    endDate: '',
  })
  const [available, setAvailable] = useState(null)
  const [details, setDetails] = useState({
    pickupLocation: rental?.spot?.location || '',
    dropoffLocation: rental?.spot?.location || '',
    rentalNotes: '',
  })

  const [payment, setPayment] = useState({
    paymentId: '',
    paymentMethod: 'upi',
  })

  const [qrCode, setQrCode] = useState(null)

  // Payment gateway details
  const PAYMENT_DETAILS = {
    upi: {
      upiId: '7410536905@ybl',
      name: 'Parking System',
      title: 'UPI QR Code Payment',
      instructions: 'Scan the QR code below using any UPI app (Google Pay, PhonePe, BHIM, etc.) or transfer directly to the UPI ID above. Enter the transaction ID received in your app below.',
    },
    card: {
      title: 'Credit/Debit Card Payment',
      instructions: 'Payment gateway integration coming soon. For now, please contact support to complete your card payment.',
      note: 'Card payments are processed securely through our payment gateway with 3D Secure authentication.',
    },
    bank_transfer: {
      title: 'Bank Transfer',
      accountName: 'Parking System Private Limited',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0000123',
      bankName: 'HDFC Bank',
      instructions: 'Transfer the amount to the bank details below. Please mention your booking ID and your name in the remarks. Confirmation may take 1-2 hours.',
    }
  }

  // Calculate days and pricing
  const calculatePricing = () => {
    if (!dates.startDate || !dates.endDate) return { days: 0, amount: 0 }
    const start = new Date(dates.startDate)
    const end = new Date(dates.endDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    const amount = (rental.dailyRate * days) + (rental.depositAmount || 0)
    return { days: Math.max(1, days), amount: Math.max(0, amount) }
  }

  const pricing = calculatePricing()

  // Check availability
  const handleCheckAvailability = async () => {
    if (!dates.startDate || !dates.endDate) {
      toast.error('Please select both dates')
      return
    }
    
    if (new Date(dates.startDate) >= new Date(dates.endDate)) {
      toast.error('Start date must be before end date')
      return
    }

    setLoading(true)
    try {
      const res = await checkRentalAvailability(rental._id, dates.startDate, dates.endDate)
      if (res.data.available) {
        setAvailable(true)
        toast.success('Rental available for selected dates!')
        setTimeout(() => setStep(2), 500)
      } else {
        setAvailable(false)
        toast.error('Not available for these dates')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error checking availability')
    } finally {
      setLoading(false)
    }
  }

  // Create booking
  const handleCreateBooking = async () => {
    setLoading(true)
    try {
      const res = await createRentalBooking({
        rentalId: rental._id,
        startDate: dates.startDate,
        endDate: dates.endDate,
        ...details,
      })
      const bookingData = res.data.data || res.data
      if (!bookingData._id) {
        throw new Error('Booking creation failed - no booking ID returned')
      }
      setBooking(bookingData)
      setStep(3)
      toast.success('Booking created! Proceed to payment')
    } catch (err) {
      console.error('Booking error:', err)
      toast.error(err.response?.data?.message || err.message || 'Error creating booking')
    } finally {
      setLoading(false)
    }
  }

  // Process payment
  const handlePayment = async () => {
    if (!payment.paymentId) {
      toast.error('Please enter payment ID')
      return
    }

    if (!booking?._id) {
      toast.error('Booking ID is missing. Please try again.')
      return
    }

    setLoading(true)
    try {
      const res = await confirmRentalPayment(booking._id, payment.paymentId, payment.paymentMethod)
      const bookingData = res.data.data || res.data
      setBooking(bookingData)
      setStep(4)
      toast.success('Payment successful!')
      setTimeout(() => {
        onSuccess?.(bookingData)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Payment error:', err)
      toast.error(err.response?.data?.message || err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  // Generate UPI QR code when booking is created
  useEffect(() => {
    if (booking && payment.paymentMethod === 'upi') {
      const upiLink = `upi://pay?pa=${PAYMENT_DETAILS.upi.upiId}&pn=${PAYMENT_DETAILS.upi.name}&am=${booking.totalAmount}&tr=ParkingBooking${booking._id?.slice(-8).toUpperCase()}`
      QRCode.toDataURL(upiLink, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(url => setQrCode(url))
        .catch(err => console.error('QR Code generation failed:', err))
    }
  }, [booking, payment.paymentMethod])

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">Book {rental.vehicle?.make} {rental.vehicle?.model}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition">
              <FiX size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Progress indicators */}
          <div className="px-6 pt-4 flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition ${s <= step ? 'bg-purple-500' : 'bg-slate-700'}`} />
            ))}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Step 1: Dates */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><FiCalendar size={16} /> Select Dates</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                    <input 
                      type="date"
                      value={dates.startDate}
                      onChange={e => setDates({ ...dates, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      style={INPUT}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">End Date</label>
                    <input 
                      type="date"
                      value={dates.endDate}
                      onChange={e => setDates({ ...dates, endDate: e.target.value })}
                      min={dates.startDate || new Date().toISOString().split('T')[0]}
                      style={INPUT}
                      className="w-full"
                    />
                  </div>
                </div>

                {pricing.days > 0 && (
                  <div className="p-3 rounded-lg" style={GLS}>
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold text-green-400">{pricing.days} days</span>
                      {' '}@ ₹{rental.dailyRate}/day + ₹{rental.depositAmount || 0} deposit
                    </p>
                    <p className="text-lg font-bold text-white mt-1">Total: ₹{pricing.amount}</p>
                  </div>
                )}

                <button 
                  onClick={handleCheckAvailability}
                  disabled={loading || !dates.startDate || !dates.endDate}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  {loading ? 'Checking...' : 'Check Availability'}
                </button>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><FiMapPin size={16} /> Rental Details</h3>
                
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Pickup Location</label>
                  <input 
                    type="text"
                    value={details.pickupLocation}
                    onChange={e => setDetails({ ...details, pickupLocation: e.target.value })}
                    placeholder="Where to pick up"
                    style={INPUT}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Dropoff Location</label>
                  <input 
                    type="text"
                    value={details.dropoffLocation}
                    onChange={e => setDetails({ ...details, dropoffLocation: e.target.value })}
                    placeholder="Where to return"
                    style={INPUT}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Rental Notes (optional)</label>
                  <textarea 
                    value={details.rentalNotes}
                    onChange={e => setDetails({ ...details, rentalNotes: e.target.value })}
                    placeholder="Any special requests..."
                    style={{...INPUT, minHeight: '80px', resize: 'none'}}
                    className="w-full"
                  />
                </div>

                <div className="p-3 rounded-lg" style={GLS}>
                  <p className="text-sm text-gray-300 mb-1">Booking Summary</p>
                  <p className="text-white font-semibold">{pricing.days} days • ₹{pricing.amount}</p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 border border-slate-600 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleCreateBooking}
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                  >
                    {loading ? 'Creating...' : 'Proceed to Payment'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && booking && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 max-h-[600px] overflow-y-auto">
                <h3 className="text-white font-semibold flex items-center gap-2"><FiDollarSign size={16} /> Payment Details</h3>
                
                {/* Price Summary */}
                <div className="p-4 rounded-lg" style={GLS}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>{pricing.days} days @ ₹{rental.dailyRate}/day</span>
                      <span>₹{rental.dailyRate * pricing.days}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Security Deposit</span>
                      <span>₹{rental.depositAmount || 0}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold text-base">
                      <span>Total Amount Due</span>
                      <span className="text-green-400">₹{booking.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2 font-semibold">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['upi', 'card', 'bank_transfer'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPayment({ ...payment, paymentMethod: method, paymentId: '' })}
                        className={`p-3 rounded-lg text-xs font-semibold transition ${
                          payment.paymentMethod === method
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                        }`}
                      >
                        {method === 'upi' ? '📱 UPI' : method === 'card' ? '💳 Card' : '🏦 Bank'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UPI Payment */}
                {payment.paymentMethod === 'upi' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex gap-2">
                      <FiAlertCircle className="text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-green-300">
                        {PAYMENT_DETAILS.upi.instructions}
                      </p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      {qrCode ? (
                        <img src={qrCode} alt="UPI QR Code" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                          <p className="text-gray-600 text-sm">Generating QR Code...</p>
                        </div>
                      )}
                    </div>

                    {/* UPI ID */}
                    <div className="p-3 rounded-lg bg-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">UPI ID</p>
                        <p className="text-white font-mono text-sm">{PAYMENT_DETAILS.upi.upiId}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_DETAILS.upi.upiId)
                          toast.success('UPI ID copied!')
                        }}
                        className="p-2 bg-purple-600 hover:bg-purple-700 rounded transition"
                      >
                        <FiCopy size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Transaction ID / UTR</label>
                      <input 
                        type="text"
                        value={payment.paymentId}
                        onChange={e => setPayment({ ...payment, paymentId: e.target.value })}
                        placeholder="Enter UPI Transaction ID from your app"
                        style={INPUT}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">You'll find this in your banking app after successful payment</p>
                    </div>
                  </motion.div>
                )}

                {/* Card Payment */}
                {payment.paymentMethod === 'card' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex gap-2">
                      <FiAlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-300">
                        {PAYMENT_DETAILS.card.instructions}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800">
                      <p className="text-xs text-gray-400 mb-2">{PAYMENT_DETAILS.card.note}</p>
                      <p className="text-sm text-gray-300">Please contact support at <span className="text-purple-400 font-semibold">support@parkingsystem.com</span> to process your card payment.</p>
                    </div>
                  </motion.div>
                )}

                {/* Bank Transfer */}
                {payment.paymentMethod === 'bank_transfer' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex gap-2">
                      <FiAlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300">
                        {PAYMENT_DETAILS.bank_transfer.instructions}
                      </p>
                    </div>

                    {/* Bank Details */}
                    <div className="space-y-2">
                      {[
                        { label: 'Account Name', value: PAYMENT_DETAILS.bank_transfer.accountName },
                        { label: 'Account Number', value: PAYMENT_DETAILS.bank_transfer.accountNumber },
                        { label: 'IFSC Code', value: PAYMENT_DETAILS.bank_transfer.ifscCode },
                        { label: 'Bank Name', value: PAYMENT_DETAILS.bank_transfer.bankName },
                      ].map((detail, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">{detail.label}</p>
                            <p className="text-white font-mono text-sm">{detail.value}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(detail.value)
                              toast.success(`${detail.label} copied!`)
                            }}
                            className="p-2 bg-purple-600 hover:bg-purple-700 rounded transition"
                          >
                            <FiCopy size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Transaction Reference</label>
                      <input 
                        type="text"
                        value={payment.paymentId}
                        onChange={e => setPayment({ ...payment, paymentId: e.target.value })}
                        placeholder="Enter UTR or transaction reference"
                        style={INPUT}
                        className="w-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 border border-slate-600 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handlePayment}
                    disabled={loading || !payment.paymentId}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
                  >
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && booking && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 text-center py-4">
                <motion.div 
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <FiCheck className="text-green-400" size={32} />
                </motion.div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
                  <p className="text-gray-400 text-sm">Your rental booking has been confirmed</p>
                </div>

                <div className="p-4 rounded-lg text-left" style={GLS}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Booking Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vehicle</span>
                      <span className="text-white font-semibold">{rental.vehicle?.make} {rental.vehicle?.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Booking ID</span>
                      <span className="text-white font-mono text-xs">{booking._id.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pickup</span>
                      <span className="text-white">{new Date(booking.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Return</span>
                      <span className="text-white">{new Date(booking.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Amount</span>
                      <span className="text-green-400 font-bold">₹{booking.totalAmount}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default RentalBookingModal
