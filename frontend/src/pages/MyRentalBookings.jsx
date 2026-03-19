import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiCalendar, FiDollarSign, FiClock, FiCheck, FiAlertCircle, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { getMyRentalBookings, cancelRentalBooking } from '../services/api'

const BG = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }

const STATUS_COLORS = {
  pending: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', label: 'Awaiting Payment' },
  confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#86efac', label: 'Confirmed' },
  active: { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', label: 'Active' },
  completed: { bg: 'rgba(107,114,128,0.15)', color: '#d1d5db', label: 'Completed' },
  cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Cancelled' },
  no_show: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', label: 'No Show' },
}

function MyRentalBookings() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [selectedStatus])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {}
      const res = await getMyRentalBookings(params)
      setBookings(res.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error loading bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setCancellingId(bookingId)
    try {
      await cancelRentalBooking(bookingId, 'Cancelled by renter')
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling booking')
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.pending

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <div className="border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-800 rounded-lg transition">
            <FiArrowLeft className="text-gray-300" size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">My Rental Bookings</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition"
              style={{
                background: selectedStatus === status ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                color: selectedStatus === status ? '#c4b5fd' : '#9ca3af',
                border: selectedStatus === status ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse" style={GLS} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <FiCalendar size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400 text-lg">No bookings found</p>
            <button 
              onClick={() => navigate('/rentals')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Browse Rentals
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {bookings.map((booking, idx) => {
                const status = getStatusColor(booking.status)
                const isExpanded = expandedId === booking._id
                const startDate = new Date(booking.startDate)
                const endDate = new Date(booking.endDate)
                const now = new Date()
                const isPastBooking = endDate < now
                const isActiveBooking = booking.status === 'active'

                return (
                  <motion.div
                    key={booking._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-2xl overflow-hidden cursor-pointer transition hover:shadow-lg"
                    style={GLS}
                    onClick={() => setExpandedId(isExpanded ? null : booking._id)}
                  >
                    {/* Main Info */}
                    <div className="p-5 flex items-start gap-4">
                      {/* Vehicle Icon */}
                      <div
                        className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                        style={{
                          background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.2))',
                          border: '1px solid rgba(139,92,246,0.3)',
                        }}
                      >
                        🚗
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-white font-bold block">
                            {booking.rental?.title}
                          </h3>
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <FiCalendar size={12} />
                            {startDate.toLocaleDateString('en-IN')} → {endDate.toLocaleDateString('en-IN')}
                          </span>
                          <span>
                            <strong className="text-gray-300">{booking.daysBooked}</strong> days
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <FiDollarSign size={12} className="text-green-400" />
                          <span className="text-white font-semibold">₹{booking.totalAmount}</span>
                          {!booking.isPaid && (
                            <span className="text-xs text-red-400">• Payment pending</span>
                          )}
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="text-2xl">
                        {booking.status === 'completed' ? '✓' : 
                         booking.status === 'cancelled' ? '✕' : 
                         booking.status === 'active' ? '🔴' : '⏳'}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-5 pb-5 border-t border-slate-700/50 space-y-3"
                        >
                          {/* Locations */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pickup</p>
                              <p className="text-sm text-gray-300">{booking.pickupLocation}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dropoff</p>
                              <p className="text-sm text-gray-300">{booking.dropoffLocation}</p>
                            </div>
                          </div>

                          {/* Notes */}
                          {booking.rentalNotes && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                              <p className="text-sm text-gray-300">{booking.rentalNotes}</p>
                            </div>
                          )}

                          {/* Pricing Breakdown */}
                          <div className="p-3 rounded-lg bg-white/5 space-y-1 text-xs">
                            <div className="flex justify-between text-gray-400">
                              <span>{booking.daysBooked} days @ ₹{booking.pricePerDay}</span>
                              <span>₹{booking.pricePerDay * booking.daysBooked}</span>
                            </div>
                            {booking.depositAmount > 0 && (
                              <div className="flex justify-between text-gray-400">
                                <span>Deposit</span>
                                <span>₹{booking.depositAmount}</span>
                              </div>
                            )}
                            {booking.damageAmount > 0 && (
                              <div className="flex justify-between text-red-400">
                                <span>Damage Charge</span>
                                <span>₹{booking.damageAmount}</span>
                              </div>
                            )}
                            <div className="border-t border-slate-600 pt-1 flex justify-between font-semibold text-white">
                              <span>Total</span>
                              <span>₹{booking.totalAmount}</span>
                            </div>
                          </div>

                          {/* Booking ID */}
                          <p className="text-xs text-gray-500">
                            Booking ID: <span className="font-mono text-gray-400">{booking._id}</span>
                          </p>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {booking.status === 'pending' && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  // Navigate to payment page or reopen payment modal
                                  toast.info('Payment process needed - contact support')
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition text-sm"
                              >
                                Complete Payment
                              </button>
                            )}
                            {['pending', 'confirmed'].includes(booking.status) && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  handleCancel(booking._id)
                                }}
                                disabled={cancellingId === booking._id}
                                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 font-semibold py-2 rounded-lg transition text-sm disabled:opacity-50"
                              >
                                {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyRentalBookings
