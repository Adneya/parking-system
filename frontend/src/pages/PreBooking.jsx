import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiCalendar, FiClock, FiMapPin, FiCpu, FiCheckCircle,
  FiArrowLeft, FiZap, FiStar, FiBattery, FiNavigation,
  FiTruck, FiShield, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { mlAllocateSpot, createBooking } from '../services/api'

const BG = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }

const VEHICLE_TYPES = [
  { id: 'car',        label: 'Car',        icon: '🚗' },
  { id: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  { id: 'suv',        label: 'SUV / Van',  icon: '🚙' },
  { id: 'truck',      label: 'Truck',      icon: '🚛' },
  { id: 'ev',         label: 'EV',         icon: '⚡' },
]

function ScoreBar({ score }) {
  const pct = Math.min(100, score)
  const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }} style={{ background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}</span>
    </div>
  )
}

function SpotCard({ spot, selected, onSelect, idx }) {
  const amenity = (a) => spot.amenities?.includes(a)
  const occupancyPct = spot.totalSpots > 0
    ? Math.round(((spot.totalSpots - (spot.availableSpots || 0)) / spot.totalSpots) * 100)
    : 0
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.07 }} whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => onSelect(spot)}
      className="relative rounded-2xl p-5 cursor-pointer transition-all"
      style={{
        ...GLS,
        border: selected ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: selected ? '0 0 30px rgba(139,92,246,0.3)' : 'none',
      }}>
      {idx === 0 && (
        <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          🤖 ML Best
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-white font-bold text-lg">{spot.name}</p>
          <p className="text-gray-400 text-xs">{spot.city} · {spot.availableSpots ?? '?'}/{spot.totalSpots} spots free</p>
        </div>
        <div className="text-right">
          <p className="text-purple-300 font-bold">₹{spot.hourlyRate}/hr</p>
          <p className="text-gray-500 text-xs">{occupancyPct}% full</p>
        </div>
      </div>
      <p className="text-gray-400 text-xs mb-1">ML compatibility score</p>
      <ScoreBar score={spot.mlScore ?? 0} />
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
        <span>City preference: <span className="text-white">{spot.preferenceScore ?? 0}</span></span>
        {typeof spot.distanceKm === 'number' && <span>Distance fit: <span className="text-white">{spot.distanceKm} km</span></span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {amenity('ev_charging') && <span className="px-2 py-0.5 rounded-full text-xs text-yellow-300" style={{ background: 'rgba(245,158,11,0.15)' }}>⚡ EV Charger</span>}
        {amenity('covered')     && <span className="px-2 py-0.5 rounded-full text-xs text-blue-300" style={{ background: 'rgba(99,102,241,0.15)' }}>☂️ Covered</span>}
        {amenity('cctv')        && <span className="px-2 py-0.5 rounded-full text-xs text-green-300" style={{ background: 'rgba(16,185,129,0.15)' }}>📷 CCTV</span>}
        {amenity('disabled')    && <span className="px-2 py-0.5 rounded-full text-xs text-purple-300" style={{ background: 'rgba(139,92,246,0.15)' }}>♿ Accessible</span>}
      </div>
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: '#8b5cf6' }}>
          <FiCheckCircle size={14} className="text-white" />
        </div>
      )}
    </motion.div>
  )
}

export default function PreBooking() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=form, 2=spots, 3=confirm, 4=success

  // Form state
  const now5 = () => { const d = new Date(); d.setMinutes(d.getMinutes() + 5); return d.toISOString().slice(0,16) }
  const [form, setForm] = useState({
    vehicleType: 'car',
    licensePlate: '',
    make: '',
    model: '',
    scheduledStart: now5(),
    scheduledEnd: '',
    preferCovered: false,
    preferEV: false,
    preferredCity: '',
    preferredLocality: '',
  })
  const [loading, setLoading] = useState(false)
  const [spots, setSpots] = useState([])
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [booking, setBooking] = useState(null)

  const durationHrs = form.scheduledStart && form.scheduledEnd
    ? Math.max(0, (new Date(form.scheduledEnd) - new Date(form.scheduledStart)) / 3600000).toFixed(1)
    : 0
  const estimatedCost = selectedSpot ? Math.ceil(durationHrs) * (selectedSpot.hourlyRate || 30) : 0

  const handleFetch = useCallback(async () => {
    if (!form.scheduledStart || !form.scheduledEnd) { toast.error('Select start and end time'); return }
    if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) { toast.error('End time must be after start'); return }
    setLoading(true)
    try {
      const res = await mlAllocateSpot({
        vehicleType:   form.vehicleType,
        scheduledStart:form.scheduledStart,
        scheduledEnd:  form.scheduledEnd,
        preferCovered: form.preferCovered,
        preferEV:      form.preferEV,
        preferredCity: form.preferredCity || undefined,
        preferredLocality: form.preferredLocality || undefined,
      })
      setSpots(res.data.data || [])
      setSelectedSpot((res.data.data || [])[0] || null)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch slots')
    } finally {
      setLoading(false)
    }
  }, [form])

  const handleConfirm = async () => {
    if (!selectedSpot) { toast.error('Select a spot first'); return }
    if (!form.licensePlate.trim()) { toast.error('Enter license plate'); return }
    setLoading(true)
    try {
      const res = await createBooking({
        spotId:        selectedSpot._id,
        vehicleType:   form.vehicleType,
        licensePlate:  form.licensePlate.toUpperCase(),
        make:          form.make,
        model:         form.model,
        scheduledStart:form.scheduledStart,
        scheduledEnd:  form.scheduledEnd,
      })
      setBooking(res.data.data)
      setStep(4)
      toast.success('Booking confirmed! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: BG }}>
      {/* Orbs */}
      <div className="fixed top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#a855f7,transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <FiArrowLeft size={18} /> {step > 1 ? 'Back' : 'Dashboard'}
        </motion.button>
        <div className="flex items-center gap-2 ml-2">
          <FiCpu className="text-purple-400" size={16} />
          <span className="text-purple-300 text-xs font-semibold">ML-Powered Slot Allocation</span>
        </div>
        {/* Steps */}
        <div className="ml-auto flex items-center gap-2">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{ background: step >= s ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.1)', color: step >= s ? '#fff' : '#6b7280' }}>
                {step > s ? '✓' : s}
              </div>
              {s < 4 && <div className="w-8 h-0.5 transition-all" style={{ background: step > s ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Form ── */}
          {step === 1 && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h1 className="text-3xl font-black text-white mb-2">Pre-Book a Parking Slot</h1>
              <p className="text-gray-400 mb-8">Our ML engine will recommend the best available spots for you.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vehicle Type */}
                <div className="rounded-2xl p-6" style={GLS}>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiTruck className="text-purple-400" /> Vehicle Type</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {VEHICLE_TYPES.map(vt => (
                      <button key={vt.id} onClick={() => setForm(f => ({ ...f, vehicleType: vt.id }))}
                        className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: form.vehicleType === vt.id ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.05)',
                          border: form.vehicleType === vt.id ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                          color: form.vehicleType === vt.id ? '#fff' : '#9ca3af',
                        }}>
                        <span className="text-xl">{vt.icon}</span> {vt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="rounded-2xl p-6" style={GLS}>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiShield className="text-purple-400" /> Vehicle Details</h3>
                  <div className="space-y-3">
                    <input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                      placeholder="License Plate (e.g. MH12AB1234)"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                      style={INPUT} />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                        placeholder="Make (e.g. Honda)" className="px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                      <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                        placeholder="Model (e.g. City)" className="px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                    </div>
                  </div>
                </div>

                {/* Time Selection */}
                <div className="rounded-2xl p-6" style={GLS}>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiCalendar className="text-purple-400" /> Booking Time</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
                      <input type="datetime-local" value={form.scheduledStart}
                        onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">End Time</label>
                      <input type="datetime-local" value={form.scheduledEnd}
                        onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT} />
                    </div>
                    {durationHrs > 0 && (
                      <div className="flex items-center gap-2 text-purple-300 text-sm">
                        <FiClock size={14} /> Duration: <strong>{durationHrs} hrs</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preferences */}
                <div className="rounded-2xl p-6" style={GLS}>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiStar className="text-purple-400" /> Preferences</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Preferred City</label>
                      <input value={form.preferredCity} onChange={e => setForm(f => ({ ...f, preferredCity: e.target.value }))}
                        placeholder="e.g. Mumbai, Delhi, Bengaluru" className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Preferred Locality / Area</label>
                      <input value={form.preferredLocality} onChange={e => setForm(f => ({ ...f, preferredLocality: e.target.value }))}
                        placeholder="e.g. BKC, Whitefield, Hitech City" className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                    </div>
                    {[
                      { key: 'preferCovered', label: 'Covered / Indoor spot', icon: '☂️' },
                      { key: 'preferEV',      label: 'EV Charging available',  icon: '⚡' },
                    ].map(p => (
                      <label key={p.key} className="flex items-center gap-3 cursor-pointer group">
                        <div onClick={() => setForm(f => ({ ...f, [p.key]: !f[p.key] }))}
                          className="w-11 h-6 rounded-full relative transition-all"
                          style={{ background: form[p.key] ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.1)' }}>
                          <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
                            style={{ left: form[p.key] ? '26px' : '4px' }} />
                        </div>
                        <span className="text-gray-300 text-sm">{p.icon} {p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleFetch} disabled={loading}
                className="mx-auto mt-8 flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-lg"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}>
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Scanning with ML…</>
                  : <><FiCpu size={20} /> Find Best Spots (ML)</>
                }
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 2: Spot Selection ── */}
          {step === 2 && (
            <motion.div key="spots" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">ML-Ranked Available Spots</h2>
                  <p className="text-gray-400 text-sm mt-1">{spots.length} spot{spots.length !== 1 ? 's' : ''} found — ranked by ML compatibility</p>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} onClick={handleFetch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-purple-300 text-sm"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <FiRefreshCw size={14} /> Refresh
                </motion.button>
              </div>

              {spots.length === 0 ? (
                <div className="text-center py-16">
                  <FiAlertCircle className="text-yellow-400 mx-auto mb-4" size={48} />
                  <p className="text-white font-bold text-xl mb-2">No spots available</p>
                  <p className="text-gray-400">Try different times or preferences.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {spots.map((s, i) => (
                    <SpotCard key={s._id} spot={s} selected={selectedSpot?._id === s._id} onSelect={setSelectedSpot} idx={i} />
                  ))}
                </div>
              )}

              {selectedSpot && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(3)}
                  className="mx-auto flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-lg"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}>
                  <FiCheckCircle size={20} /> Confirm: {selectedSpot.name}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && selectedSpot && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-white mb-6 text-center">Review Booking</h2>
              <div className="rounded-2xl p-6 mb-4" style={GLS}>
                <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                    {VEHICLE_TYPES.find(v => v.id === form.vehicleType)?.icon || '🚗'}
                  </div>
                  <div>
                    <p className="text-white font-bold">{form.licensePlate || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">{form.make} {form.model}</p>
                  </div>
                </div>
                {[
                  ['Parking Lot',  selectedSpot.name],
                  ['Location',     `${selectedSpot.city || 'N/A'}`],
                  ['Available',    `${selectedSpot.availableSpots ?? '?'} of ${selectedSpot.totalSpots} spots`],
                  ['Start',       new Date(form.scheduledStart).toLocaleString()],
                  ['End',         new Date(form.scheduledEnd).toLocaleString()],
                  ['Duration',    `${durationHrs} hrs`],
                  ['Rate',        `₹${selectedSpot.hourlyRate || 30}/hr`],
                  ['ML Score',    selectedSpot.mlScore],
                  ['City Preference Score', selectedSpot.preferenceScore ?? 0],
                  ['Distance Fit', selectedSpot.distanceKm != null ? `${selectedSpot.distanceKm} km` : 'N/A'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 text-base font-bold mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-white">Estimated Total</span>
                  <span className="text-purple-300">₹{estimatedCost}</span>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleConfirm} disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Confirming…</>
                  : <><FiCheckCircle size={20} /> Confirm Booking</>
                }
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === 4 && booking && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} className="max-w-md mx-auto text-center py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl mb-6"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
                ✓
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2">Booking Confirmed!</h2>
              <p className="text-gray-400 mb-6">Your slot is reserved. Show the QR code at entry.</p>

              {/* QR Code */}
              {booking.qrCode && (
                <div className="inline-block p-3 rounded-2xl mb-6" style={{ background: '#fff', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
                  <img src={booking.qrCode} alt="Check-in QR" className="w-40 h-40" />
                </div>
              )}

              <div className="rounded-2xl p-5 text-left mb-6 space-y-2" style={GLS}>
                {[
                  ['Booking ID', booking._id?.slice(-8).toUpperCase()],
                  ['Parking Lot', booking.spot?.name || selectedSpot?.name || 'N/A'],
                  ['Location',   booking.spot?.city || selectedSpot?.city || 'N/A'],
                  ['Start',      new Date(booking.scheduledStart).toLocaleString()],
                  ['End',        new Date(booking.scheduledEnd).toLocaleString()],
                  ['Status',     'Confirmed ✓'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <motion.button whileHover={{ scale: 1.04 }} onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                  Dashboard
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} onClick={() => { setStep(1); setBooking(null); setSpots([]); }}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Book Another
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
