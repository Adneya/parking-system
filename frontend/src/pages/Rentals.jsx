import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCheckCircle,
  FiXCircle, FiClock, FiDollarSign, FiTruck, FiList, FiUser, FiShoppingCart,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { listRentals, getMyRentals, createRental, updateRental, deleteRental, getSpots } from '../services/api'
import RentalBookingModal from '../components/RentalBookingModal'

const BG  = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }

const STATUS_STYLES = {
  draft:     { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Draft' },
  active:    { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Active' },
  suspended: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'Suspended' },
  expired:   { bg: 'rgba(107,114,128,0.15)',color: '#6b7280', label: 'Expired' },
}

const VEHICLE_TYPES = ['car', 'motorcycle', 'suv', 'truck', 'ev']
const FEATURES_LIST = ['GPS', 'AC', 'Bluetooth', 'Sunroof', 'Backup Camera', 'EV Charger', 'Child Seat']

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function RentalCard({ rental, mine, onEdit, onDelete, onBook, idx }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
      className="rounded-2xl overflow-hidden" style={GLS}>
      <button className="w-full text-left p-5 flex items-start gap-4" onClick={() => setOpen(o => !o)}>
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(99,102,241,0.2))', border: '1px solid rgba(139,92,246,0.3)' }}>
          {rental.vehicle?.type === 'ev' ? '⚡' : rental.vehicle?.type === 'truck' ? '🚛' : rental.vehicle?.type === 'motorcycle' ? '🏍️' : '🚗'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold truncate">{rental.vehicle?.make} {rental.vehicle?.model} ({rental.vehicle?.year})</p>
            <StatusBadge status={rental.status} />
            {!rental.approvedByAdmin && rental.status !== 'draft' && (
              <span className="px-2 py-0.5 rounded-full text-xs text-yellow-300" style={{ background: 'rgba(245,158,11,0.12)' }}>Pending Approval</span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5 capitalize">{rental.vehicle?.type} · {rental.spot?.name || rental.spot?.spotNumber || 'Spot'}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-purple-300 text-sm font-semibold">₹{rental.dailyRate}/day</span>
            {rental.weeklyRate  && <span className="text-gray-400 text-xs">₹{rental.weeklyRate}/week</span>}
            {rental.monthlyRate && <span className="text-gray-400 text-xs">₹{rental.monthlyRate}/month</span>}
          </div>
        </div>
        {mine ? (
          <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(rental)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10">
              <FiEdit2 size={14} />
            </button>
            <button onClick={() => onDelete(rental._id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
              <FiTrash2 size={14} />
            </button>
          </div>
        ) : (
          rental.status === 'active' && (
            <button 
              onClick={e => {
                e.stopPropagation()
                onBook(rental)
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center gap-2 text-sm"
            >
              <FiShoppingCart size={14} />
              Book Now
            </button>
          )
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 space-y-3">
            {rental.vehicle?.features?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rental.vehicle.features.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-full text-xs text-purple-300" style={{ background: 'rgba(139,92,246,0.12)' }}>{f}</span>
                ))}
              </div>
            )}
            {rental.depositAmount > 0 && (
              <p className="text-gray-400 text-xs">Security deposit: <span className="text-white">₹{rental.depositAmount}</span></p>
            )}
            {(rental.host?.firstName || rental.host?.email) && !mine && (
              <p className="text-gray-400 text-xs flex items-center gap-1"><FiUser size={11} /> Host: <span className="text-white">{rental.host.firstName ? `${rental.host.firstName} ${rental.host.lastName || ''}`.trim() : rental.host.email}</span></p>
            )}
            {rental.description && <p className="text-gray-400 text-xs">{rental.description}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const EMPTY_FORM = {
  spotId: '', title: '', vehicleType: 'car', make: '', model: '', year: new Date().getFullYear(), licensePlate: '',
  dailyRate: '', weeklyRate: '', monthlyRate: '', depositAmount: '', description: '',
  features: [], availableFrom: '', availableTo: '',
}

function RentalForm({ initial, onSave, onCancel, loading }) {
  const [f, setF] = useState(initial || EMPTY_FORM)
  const [spots, setSpots] = useState([])
  useEffect(() => {
    getSpots({ limit: 100 }).then(r => setSpots(r.data?.data || r.data?.spots || [])).catch(() => {})
  }, [])
  const toggleFeature = (feat) => setF(p => ({ ...p, features: p.features.includes(feat) ? p.features.filter(x => x !== feat) : [...p.features, feat] }))
  return (
    <div className="rounded-2xl p-6" style={GLS}>
      <h3 className="text-white font-bold text-lg mb-5">{initial ? 'Edit Listing' : 'Create New Listing'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Parking Spot *</label>
          <select value={f.spotId} onChange={e => setF(p => ({ ...p, spotId: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT}>
            <option value="" className="bg-gray-900">-- Select a parking spot --</option>
            {spots.map(s => (
              <option key={s._id} value={s._id} className="bg-gray-900">
                {s.name} — {s.city} (₹{s.hourlyRate}/hr)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Title *</label>
          <input value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Cozy downtown parking spot" className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Vehicle Type</label>
          <select value={f.vehicleType} onChange={e => setF(p => ({ ...p, vehicleType: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT}>
            {VEHICLE_TYPES.map(t => <option key={t} value={t} className="bg-gray-900 capitalize">{t}</option>)}
          </select>
        </div>
        {[
          ['make', 'Make (e.g. Honda)'],
          ['model', 'Model (e.g. City)'],
          ['year', 'Year'],
          ['licensePlate', 'License Plate'],
          ['dailyRate', 'Daily Rate (₹) *'],
          ['weeklyRate', 'Weekly Rate (₹)'],
          ['monthlyRate', 'Monthly Rate (₹)'],
          ['depositAmount', 'Security Deposit (₹)'],
        ].map(([key, ph]) => (
          <div key={key}>
            <label className="text-gray-400 text-xs mb-1 block">{ph.split(' *')[0]}</label>
            <input value={f[key]} onChange={e => setF(p => ({ ...p, [key]: e.target.value }))}
              placeholder={ph} type={['year','dailyRate','weeklyRate','monthlyRate','depositAmount'].includes(key) ? 'number' : 'text'}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
          </div>
        ))}
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Available From</label>
          <input type="date" value={f.availableFrom} onChange={e => setF(p => ({ ...p, availableFrom: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT} />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Available To</label>
          <input type="date" value={f.availableTo} onChange={e => setF(p => ({ ...p, availableTo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={INPUT} />
        </div>
      </div>
      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-2 block">Features</label>
        <div className="flex flex-wrap gap-2">
          {FEATURES_LIST.map(feat => (
            <button key={feat} onClick={() => toggleFeature(feat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: f.features.includes(feat) ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
                border:     f.features.includes(feat) ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                color:      f.features.includes(feat) ? '#c4b5fd' : '#6b7280',
              }}>
              {feat}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-5">
        <label className="text-gray-400 text-xs mb-1 block">Description</label>
        <textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))}
          rows={2} placeholder="Optional description…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500 resize-none" style={INPUT} />
      </div>
      <div className="flex gap-3">
        <motion.button whileHover={{ scale: 1.03 }} onClick={() => onSave(f)} disabled={loading}
          className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            : <FiCheckCircle size={16} />}
          {initial ? 'Save Changes' : 'Create Listing'}
        </motion.button>
        <button onClick={onCancel} className="px-5 py-3 rounded-xl font-semibold text-gray-400"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Rentals() {
  const navigate = useNavigate()
  const [tab,    setTab]    = useState('browse')
  const [browse, setBrowse] = useState([])
  const [mine,   setMine]   = useState([])
  const [loading, setLoading] = useState(false)
  const [formMode, setFormMode] = useState(null) // null | 'create' | rental object
  const [saving, setSaving]   = useState(false)
  const [bookingRental, setBookingRental] = useState(null) // for booking modal

  const loadBrowse = useCallback(async () => {
    setLoading(true)
    try { const r = await listRentals(); setBrowse(r.data.data || []) }
    catch (_) {}
    finally { setLoading(false) }
  }, [])

  const loadMine = useCallback(async () => {
    setLoading(true)
    try { const r = await getMyRentals(); setMine(r.data.data || []) }
    catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'browse') loadBrowse(); else if (tab === 'mine') loadMine() }, [tab, loadBrowse, loadMine])

  const handleSave = async (form) => {
    if (!form.spotId || !form.title || !form.dailyRate) { toast.error('Spot ID, title and daily rate are required'); return }
    setSaving(true)
    try {
      const payload = {
        spotId: form.spotId,
        title: form.title,
        vehicle: { type: form.vehicleType, make: form.make, model: form.model, year: Number(form.year), licensePlate: form.licensePlate, features: form.features },
        dailyRate: Number(form.dailyRate), weeklyRate: form.weeklyRate ? Number(form.weeklyRate) : undefined,
        monthlyRate: form.monthlyRate ? Number(form.monthlyRate) : undefined,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : 0,
        description: form.description,
        availableFrom: form.availableFrom || undefined, availableTo: form.availableTo || undefined,
      }
      if (formMode === 'create') { await createRental(payload); toast.success('Listing created!') }
      else { await updateRental(formMode._id, payload); toast.success('Listing updated!') }
      setFormMode(null)
      loadMine()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rental listing?')) return
    try { await deleteRental(id); toast.success('Deleted'); loadMine() }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed') }
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="fixed top-1/4 left-1/3 w-96 h-96 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#a855f7,transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center gap-4"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <FiArrowLeft size={18} /> Dashboard
        </motion.button>
        <FiTruck className="text-purple-400 ml-2" size={18} />
        <span className="text-white font-bold text-sm">Rental Vehicles</span>
        <div className="ml-auto flex gap-1.5">
          {[['browse','Browse',FiList], ['mine','My Listings',FiUser]].map(([t,l,Icon]) => (
            <button key={t} onClick={() => { setTab(t); setFormMode(null) }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                color:      tab === t ? '#fff' : '#9ca3af',
              }}>
              <Icon size={13} /> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* Browse */}
          {tab === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-black text-white mb-2">Available Rentals</h1>
              <p className="text-gray-400 mb-8">Browse vehicles listed by hosts in our parking network.</p>
              {loading ? (
                <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
              ) : browse.length === 0 ? (
                <div className="text-center py-20">
                  <FiTruck className="text-gray-500 mx-auto mb-4" size={48} />
                  <p className="text-white font-bold text-xl mb-1">No rentals available</p>
                  <p className="text-gray-400">Check back later or host your own vehicle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {browse.map((r, i) => <RentalCard key={r._id} rental={r} mine={false} idx={i} onBook={setBookingRental} />)}
                </div>
              )}
            </motion.div>
          )}

          {/* Mine */}
          {tab === 'mine' && (
            <motion.div key="mine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-black text-white">My Listings</h1>
                {formMode === null && (
                  <motion.button whileHover={{ scale: 1.05 }} onClick={() => setFormMode('create')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
                    <FiPlus size={16} /> New Listing
                  </motion.button>
                )}
              </div>
              <p className="text-gray-400 mb-8">Manage your rental vehicle listings.</p>

              <AnimatePresence>
                {formMode !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                    <RentalForm
                      initial={formMode !== 'create' ? {
                        spotId: formMode.spot?._id || formMode.spot || '',
                        title: formMode.title || '',
                        vehicleType: formMode.vehicle?.type || 'car',
                        make: formMode.vehicle?.make || '',
                        model: formMode.vehicle?.model || '',
                        year: formMode.vehicle?.year || new Date().getFullYear(),
                        licensePlate: formMode.vehicle?.licensePlate || '',
                        dailyRate: formMode.dailyRate || '',
                        weeklyRate: formMode.weeklyRate || '',
                        monthlyRate: formMode.monthlyRate || '',
                        depositAmount: formMode.depositAmount || '',
                        description: formMode.description || '',
                        features: formMode.vehicle?.features || [],
                        availableFrom: formMode.availability?.from?.slice(0,10) || '',
                        availableTo:   formMode.availability?.to?.slice(0,10) || '',
                      } : null}
                      onSave={handleSave}
                      onCancel={() => setFormMode(null)}
                      loading={saving}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
              ) : mine.length === 0 ? (
                <div className="text-center py-16">
                  <FiDollarSign className="text-gray-500 mx-auto mb-4" size={40} />
                  <p className="text-white font-bold text-lg mb-1">No listings yet</p>
                  <p className="text-gray-400 text-sm">Click "New Listing" to host your vehicle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mine.map((r, i) => (
                    <RentalCard key={r._id} rental={r} mine idx={i}
                      onEdit={setFormMode} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Booking Modal */}
      {bookingRental && (
        <RentalBookingModal 
          rental={bookingRental}
          onClose={() => setBookingRental(null)}
          onSuccess={(booking) => {
            toast.success('Booking successful! Check your bookings page for details');
            loadBrowse();
          }}
        />
      )}
    </div>
  )
}
