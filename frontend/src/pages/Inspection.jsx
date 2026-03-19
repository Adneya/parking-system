import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiArrowLeft, FiCamera, FiUpload, FiCheckCircle, FiAlertTriangle,
  FiXCircle, FiEye, FiClock, FiShield, FiInfo,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { submitInspection, getUserInspections } from '../services/api'

const BG  = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }

const SEV_COLORS  = { none: '#10b981', minor: '#f59e0b', moderate: '#f97316', severe: '#ef4444' }
const SEV_LABELS  = { none: 'No Damage', minor: 'Minor', moderate: 'Moderate', severe: 'Severe' }
const INSP_TYPES  = [{ id: 'check_in', label: 'Check-In' }, { id: 'check_out', label: 'Check-Out' }]

function ConfidenceMeter({ label, value, color }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="my-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }} style={{ background: color }} />
      </div>
    </div>
  )
}

function DamageChip({ item }) {
  const c = SEV_COLORS[item.severity] || '#6366f1'
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-4" style={{ ...GLS, border: `1px solid ${c}30` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
        <span className="text-white font-semibold text-sm capitalize">{item.location || 'Unknown area'}</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${c}25`, color: c }}>
          {SEV_LABELS[item.severity] || item.severity}
        </span>
      </div>
      <p className="text-gray-400 text-xs mb-2">{item.description}</p>
      <ConfidenceMeter label="CV Confidence" value={item.confidence} color={c} />
    </motion.div>
  )
}

function HistoryCard({ insp, idx }) {
  const [open, setOpen] = useState(false)
  const score = Number(((insp.overallDamageScore ?? 0) / 10).toFixed(1))
  const scoreColor = score === 0 ? '#10b981' : score < 4 ? '#f59e0b' : score < 7 ? '#f97316' : '#ef4444'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
      className="rounded-2xl overflow-hidden" style={GLS}>
      <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: score === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${scoreColor}40` }}>
            {score === 0 ? '✅' : '⚠️'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{insp.licensePlate || 'N/A'}</p>
            <p className="text-gray-400 text-xs capitalize">{insp.inspectionType?.replace('_', ' ')} · {new Date(insp.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: scoreColor }}>Score {score}/10</p>
            <p className="text-gray-500 text-xs">{insp.damageReports?.length || 0} item{insp.damageReports?.length !== 1 ? 's' : ''}</p>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }}>
            <FiEye size={16} className="text-gray-400" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-400">Plate Detected: </span><span className="text-white">{insp.detectedPlate || '—'}</span></div>
              <div><span className="text-gray-400">Match: </span>
                <span className={insp.plateMatchResult === 'match' ? 'text-green-400' : 'text-yellow-400'}>
                  {insp.plateMatchResult === 'match' ? '✓ Match' : insp.plateMatchResult === 'mismatch' ? '✗ Mismatch' : '—'}
                </span>
              </div>
            </div>
            {insp.damageReports?.length > 0 && (
              <div className="space-y-2">
                {insp.damageReports.map((d, i) => <DamageChip key={i} item={d} />)}
              </div>
            )}
            {(!insp.damageReports || insp.damageReports.length === 0) && (
              <div className="flex items-center gap-2 text-green-400 text-sm"><FiCheckCircle /> No damage detected</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Inspection() {
  const navigate = useNavigate()
  const fileRef  = useRef(null)
  const [tab, setTab] = useState('new') // 'new' | 'history'
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  // Form
  const [form, setForm] = useState({ inspectionType: 'check_in', licensePlate: '', sessionId: '' })
  const [images, setImages]   = useState([]) // base64 strings
  const [previews, setPreviews] = useState([])
  const [result, setResult]   = useState(null)

  const loadHistory = async () => {
    setHistLoading(true)
    try {
      const res = await getUserInspections()
      setHistory(res.data.data || [])
    } catch (_) { /* silent */ }
    finally { setHistLoading(false) }
  }

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 4)
    const readers = arr.map(f => new Promise(resolve => {
      const r = new FileReader()
      r.onload = e => resolve(e.target.result)
      r.readAsDataURL(f)
    }))
    Promise.all(readers).then(bases => {
      setImages(bases)
      setPreviews(bases)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (!form.licensePlate.trim()) { toast.error('Enter license plate'); return }
    if (images.length === 0) { toast.error('Upload at least one image'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await submitInspection({
        inspectionType: form.inspectionType,
        licensePlate:   form.licensePlate.toUpperCase(),
        bookingId:      form.sessionId || undefined,
        imageBase64s:   images,
      })
      setResult(res.data.data)
      toast.success('Inspection complete!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Inspection failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setImages([])
    setPreviews([])
    setForm({ inspectionType: 'check_in', licensePlate: '', sessionId: '' })
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="fixed top-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#a855f7,transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <FiArrowLeft size={18} /> Dashboard
        </motion.button>
        <FiCamera className="text-purple-400 ml-2" size={18} />
        <span className="text-white font-bold text-sm">CV Vehicle Inspection</span>
        <div className="ml-auto flex gap-1">
          {['new', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all"
              style={{
                background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                color:      tab === t ? '#fff' : '#9ca3af',
              }}>
              {t === 'new' ? 'New Inspection' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── New Inspection ── */}
          {tab === 'new' && !result && (
            <motion.div key="new" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-black text-white mb-2">Vehicle Inspection</h1>
              <p className="text-gray-400 mb-8">Upload vehicle photos. Our CV engine detects damage and reads license plates.</p>

              {/* Type + Fields */}
              <div className="rounded-2xl p-6 mb-5" style={GLS}>
                <div className="flex gap-3 mb-4">
                  {INSP_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, inspectionType: t.id }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: form.inspectionType === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                        border:     form.inspectionType === t.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        color:      form.inspectionType === t.id ? '#fff' : '#9ca3af',
                      }}>
                      {t.id === 'check_in' ? '🔑' : '🚪'} {t.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">License Plate *</label>
                    <input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                      placeholder="MH12AB1234" className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Session ID (optional)</label>
                    <input value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
                      placeholder="Booking or session ID" className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500" style={INPUT} />
                  </div>
                </div>
              </div>

              {/* Upload zone */}
              <div className="rounded-2xl p-6 mb-5" style={GLS}>
                <div
                  onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                  style={{ borderColor: images.length > 0 ? '#8b5cf6' : 'rgba(255,255,255,0.15)' }}>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => handleFiles(e.target.files)} />
                  <FiUpload className="text-purple-400" size={32} />
                  <p className="text-white font-semibold">Drop images or click to upload</p>
                  <p className="text-gray-500 text-xs">Up to 4 images · JPG, PNG, WEBP</p>
                </div>
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {previews.map((p, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                        <img src={p} alt="" className="w-full h-full object-cover" />
                        <button className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                          onClick={e => { e.stopPropagation(); setImages(imgs => imgs.filter((_,j) => j!==i)); setPreviews(ps => ps.filter((_,j) => j!==i)) }}>
                          <FiXCircle size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6 px-1">
                <FiInfo size={14} className="text-blue-400 flex-shrink-0" />
                <p className="text-gray-500 text-xs">In production, this connects to OpenALPR / AWS Rekognition. Currently uses a CV simulation engine.</p>
              </div>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleSubmit} disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 40px rgba(139,92,246,0.35)' }}>
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Analyzing…</>
                  : <><FiCamera size={20} /> Run CV Inspection</>
                }
              </motion.button>
            </motion.div>
          )}

          {/* ── Result ── */}
          {tab === 'new' && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">Inspection Results</h2>
                <motion.button whileHover={{ scale: 1.05 }} onClick={reset}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  New Inspection
                </motion.button>
              </div>

              {/* Plate result */}
              <div className="rounded-2xl p-6 mb-4" style={GLS}>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FiShield className="text-purple-400" /> License Plate Recognition</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Provided</p>
                    <p className="text-white font-bold text-xl tracking-widest">{result.licensePlate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">CV Detected</p>
                    <p className="font-bold text-xl tracking-widest"
                      style={{ color: result.plateMatchResult === 'match' ? '#10b981' : result.plateMatchResult === 'mismatch' ? '#ef4444' : '#f59e0b' }}>
                      {result.detectedPlate || '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {result.plateMatchResult === 'match'
                    ? <><FiCheckCircle className="text-green-400" /> <span className="text-green-400 font-semibold text-sm">Plate Match Confirmed</span></>
                    : result.plateMatchResult === 'mismatch'
                    ? <><FiXCircle className="text-red-400" /> <span className="text-red-400 font-semibold text-sm">Plate Mismatch — Review Required</span></>
                    : <><FiAlertTriangle className="text-yellow-400" /> <span className="text-yellow-400 font-semibold text-sm">Could not verify plate</span></>
                  }
                </div>
                <ConfidenceMeter label="Plate Recognition Confidence" value={result.plateConfidence} color="#8b5cf6" />
              </div>

              {/* Damage */}
              <div className="rounded-2xl p-6 mb-4" style={GLS}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2"><FiAlertTriangle className="text-yellow-400" /> Damage Detection</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Score:</span>
                    <span className="text-xl font-black"
                      style={{ color: SEV_COLORS[(result.overallDamageScore || 0) === 0 ? 'none' : (result.overallDamageScore || 0) < 40 ? 'minor' : (result.overallDamageScore || 0) < 70 ? 'moderate' : 'severe'] }}>
                      {Number(((result.overallDamageScore || 0) / 10).toFixed(1))}/10
                    </span>
                  </div>
                </div>
                {result.damageReports?.length > 0 ? (
                  <div className="space-y-3">
                    {result.damageReports.map((d, i) => <DamageChip key={i} item={d} />)}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <FiCheckCircle className="text-green-400" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">No damage detected</p>
                      <p className="text-gray-400 text-xs">Vehicle appears to be in good condition.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-approved badge */}
              {result.autoApproved && (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <FiCheckCircle className="text-green-400" size={18} />
                  <p className="text-green-300 text-sm font-semibold">Auto-approved — No issues detected</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── History ── */}
          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">Inspection History</h2>
                <span className="text-gray-400 text-sm">{history.length} record{history.length !== 1 ? 's' : ''}</span>
              </div>
              {histLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16">
                  <FiClock className="text-gray-500 mx-auto mb-4" size={40} />
                  <p className="text-white font-bold text-lg mb-1">No inspections yet</p>
                  <p className="text-gray-400 text-sm">Run your first CV inspection to see results here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => <HistoryCard key={h._id} insp={h} idx={i} />)}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
