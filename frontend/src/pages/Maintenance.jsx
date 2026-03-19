import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  FiArrowLeft, FiAlertTriangle, FiAlertCircle, FiInfo,
  FiCheckCircle, FiRefreshCw, FiCpu, FiClock, FiTool,
  FiChevronDown, FiPlus, FiSearch, FiX, FiBell, FiActivity,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { AuthContext } from '../context/AuthContext'
import {
  getMaintenanceSummary, getMaintenanceAlerts,
  createMaintenanceAlert, updateMaintenanceAlert, runPredictiveScan,
} from '../services/api'

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BG    = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS   = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }
const INPUT = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }

// â”€â”€â”€ Severity config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SEV = {
  critical: { bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.28)',  text: '#ef4444', label: 'Critical', icon: FiAlertTriangle },
  warning:  { bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.28)', text: '#f59e0b', label: 'Warning',  icon: FiAlertCircle   },
  info:     { bg: 'rgba(99,102,241,0.09)', border: 'rgba(99,102,241,0.28)', text: '#818cf8', label: 'Info',     icon: FiInfo          },
}

// â”€â”€â”€ Status config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_FLOW   = ['open', 'acknowledged', 'in_progress', 'resolved', 'dismissed']
const STATUS_LABELS = { open: 'Open', acknowledged: 'Acknowledged', in_progress: 'In Progress', resolved: 'Resolved', dismissed: 'Dismissed' }
const STATUS_COLORS = { open: '#ef4444', acknowledged: '#f59e0b', in_progress: '#6366f1', resolved: '#10b981', dismissed: '#6b7280' }
// Allowed next statuses for non-admins (linear flow)
const STATUS_NEXT   = {
  open: ['acknowledged', 'dismissed'],
  acknowledged: ['in_progress', 'dismissed'],
  in_progress: ['resolved', 'dismissed'],
  resolved: [], dismissed: [],
}

// â”€â”€â”€ Alert type labels + icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALERT_TYPES = [
  { value: 'sensor_battery_low',   label: 'Battery Low',   icon: 'ðŸ”‹' },
  { value: 'sensor_fault',         label: 'Sensor Fault',  icon: 'âš¡' },
  { value: 'occupancy_anomaly',    label: 'Occ. Anomaly',  icon: 'ðŸ“Š' },
  { value: 'scheduled_inspection', label: 'Inspection',    icon: 'ðŸ“‹' },
  { value: 'damage_detected',      label: 'Damage',        icon: 'ðŸ’¥' },
  { value: 'manual',               label: 'Manual',        icon: 'ðŸ”§' },
  { value: 'system',               label: 'System',        icon: 'ðŸ–¥ï¸' },
]
const alertTypeIcon = (t) => ALERT_TYPES.find(x => x.value === t)?.icon || 'ðŸ””'
const alertTypeLabel = (t) => ALERT_TYPES.find(x => x.value === t)?.label || t?.replace(/_/g, ' ') || 'â€”'

const PAGE_SIZE = 10

// ─── Floating particle ───────────────────────────────────────────────────────
function FloatingParticle({ x, y, size, color, duration, delay }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: 'blur(1px)' }}
      animate={{
        y: [0, -40, 0, 20, 0],
        x: [0, 15, -10, 5, 0],
        opacity: [0, 0.6, 0.3, 0.6, 0],
        scale: [0.5, 1.2, 0.8, 1, 0.5],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

const PARTICLES = [
  { x: 10, y: 20, size: 4, color: '#ef444455', duration: 8,  delay: 0   },
  { x: 85, y: 15, size: 3, color: '#8b5cf655', duration: 11, delay: 1.5 },
  { x: 60, y: 70, size: 5, color: '#f59e0b44', duration: 9,  delay: 0.8 },
  { x: 30, y: 80, size: 3, color: '#6366f155', duration: 12, delay: 2.2 },
  { x: 75, y: 45, size: 4, color: '#10b98144', duration: 7,  delay: 3.1 },
  { x: 20, y: 55, size: 2, color: '#c4b5fd55', duration: 10, delay: 1.3 },
  { x: 90, y: 75, size: 4, color: '#ef444433', duration: 14, delay: 4   },
  { x: 45, y: 10, size: 3, color: '#8b5cf644', duration: 9,  delay: 0.5 },
]

// â”€â”€â”€ Pulsing dot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PulseDot({ color, pulse }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {pulse && (
        <motion.span
          animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: color }} />
    </span>
  )
}

// â”€â”€â”€ Animated counter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Counter({ value = 0 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf
    let cur = 0
    const tick = () => {
      cur = Math.min(value, cur + Math.max(1, Math.ceil(value / 18)))
      setN(cur)
      if (cur < value) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n}</>
}

// â”€â”€â”€ Stat card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ label, value, color, icon, delay = 0 }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-30, 30], [8, -8])
  const rotateY = useTransform(x, [-30, 30], [-8, 8])
  const springX = useSpring(rotateX, { stiffness: 300, damping: 25 })
  const springY = useSpring(rotateY, { stiffness: 300, damping: 25 })

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }
  const resetMouse = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 600, transformStyle: 'preserve-3d',
               background: `${color}0d`, border: `1px solid ${color}28` }}
      onMouseMove={handleMouse} onMouseLeave={resetMouse}
      whileHover={{ scale: 1.04, boxShadow: `0 0 28px ${color}40` }}
      className="rounded-2xl p-4 flex items-center gap-3 cursor-default relative overflow-hidden">
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(105deg, transparent 40%, ${color}18 50%, transparent 60%)` }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, repeatDelay: 4 }}
      />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{ color }}>
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeInOut' }}>
          {icon}
        </motion.div>
        {/* Ring pulse around icon */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{ opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, delay, repeat: Infinity }}
          style={{ border: `2px solid ${color}`, transform: 'scale(1.35)' }}
        />
      </div>
      <div>
        <p className="text-2xl font-black leading-none" style={{ color }}>
          <Counter value={value ?? 0} />
        </p>
        <p className="text-gray-400 text-xs mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

// â”€â”€â”€ Chart tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ChartTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(30,20,60,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <p className="font-bold" style={{ color: d.payload?.color || '#c4b5fd' }}>{d.payload?.name ?? d.name}</p>
      <p className="text-white">{d.value}</p>
    </div>
  )
}

// â”€â”€â”€ Severity donut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SeverityDonut({ critical = 0, warning = 0, info = 0 }) {
  const [hovered, setHovered] = useState(null)
  const data = [
    { name: 'Critical', value: critical, color: '#ef4444' },
    { name: 'Warning',  value: warning,  color: '#f59e0b' },
    { name: 'Info',     value: info,     color: '#818cf8' },
  ].filter(d => d.value > 0)
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-36">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="w-14 h-14 rounded-full border-2 border-green-400/30 border-t-green-400 mb-2"
      />
      <FiCheckCircle className="text-green-400 absolute" size={22} />
      <p className="text-green-400 text-xs mt-10 font-semibold">All clear</p>
    </div>
  )
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={48} outerRadius={74} paddingAngle={3}
            dataKey="value" animationBegin={0} animationDuration={900}
            onMouseEnter={(_, i) => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            {data.map((e, i) => (
              <Cell key={i} fill={e.color}
                style={{ filter: hovered === i ? `drop-shadow(0 0 8px ${e.color})` : 'none',
                         transform: hovered === i ? 'scale(1.06)' : 'scale(1)',
                         transformOrigin: 'center', transition: 'all 0.2s' }} />
            ))}
          </Pie>
          <RTooltip content={<ChartTip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {hovered !== null ? (
            <motion.div key={hovered} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <p className="text-lg font-black" style={{ color: data[hovered].color }}>{data[hovered].value}</p>
              <p className="text-[10px] text-gray-400">{data[hovered].name}</p>
            </motion.div>
          ) : (
            <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="text-lg font-black text-white">{total}</p>
              <p className="text-[10px] text-gray-500">total</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// â”€â”€â”€ Status bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatusBars({ summary }) {
  if (!summary) return null
  const data = [
    { name: 'Open',        value: summary.open       || 0, color: '#ef4444' },
    { name: 'In Progress', value: summary.inProgress || 0, color: '#6366f1' },
    { name: 'Resolved',    value: summary.resolved   || 0, color: '#10b981' },
    { name: 'Dismissed',   value: summary.dismissed  || 0, color: '#6b7280' },
  ]
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} barSize={24} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <RTooltip content={<ChartTip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// â”€â”€â”€ Alert Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AlertCard({ alert, onUpdate, isAdmin, idx }) {
  const [expanded, setExpanded]   = useState(false)
  const [newStatus, setNewStatus] = useState(alert.status)
  const [note, setNote]           = useState(alert.resolutionNote || '')
  const [saving, setSaving]       = useState(false)

  const sev      = SEV[alert.severity] || SEV.info
  const Icon     = sev.icon
  const isCrit   = alert.severity === 'critical' && ['open', 'acknowledged'].includes(alert.status)
  const isDone   = ['resolved', 'dismissed'].includes(alert.status)
  const nextOpts = isAdmin ? STATUS_FLOW.filter(s => s !== alert.status) : (STATUS_NEXT[alert.status] || [])
  const daysUntil = alert.predictedFailureDate
    ? Math.ceil((new Date(alert.predictedFailureDate) - Date.now()) / 86400000) : null

  const handleUpdate = async () => {
    if (newStatus === alert.status && note === (alert.resolutionNote || '')) return
    setSaving(true)
    try {
      const payload = { status: newStatus }
      if (note.trim()) payload.resolutionNote = note.trim()
      const res = await onUpdate(alert._id, payload)
      toast.success(`Alert â†’ ${STATUS_LABELS[newStatus]}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
      setNewStatus(alert.status)
    } finally { setSaving(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      layout
      whileHover={{ scale: 1.008, boxShadow: `0 4px 24px ${sev.text}22` }}
      className="rounded-2xl overflow-hidden"
      style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>

      {/* Header row */}
      <button className="w-full flex items-start gap-3 px-5 py-4 text-left" onClick={() => setExpanded(o => !o)}>
        {/* Severity icon + pulse dot */}
        <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
          <PulseDot color={sev.text} pulse={isCrit} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${sev.text}1a`, border: `1px solid ${sev.text}35` }}>
            <Icon size={14} style={{ color: sev.text }} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm">{alert.title}</span>
            {alert.alertType && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] text-gray-400"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {alertTypeIcon(alert.alertType)} {alertTypeLabel(alert.alertType)}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs line-clamp-1 mb-1.5">{alert.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: `${sev.text}18`, color: sev.text }}>{sev.label}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: `${STATUS_COLORS[alert.status]}18`, color: STATUS_COLORS[alert.status] }}>
              {STATUS_LABELS[alert.status]}
            </span>
            {alert.mlConfidence > 0 && (
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <FiCpu size={9} /> {Math.round(alert.mlConfidence * 100)}% ML
              </span>
            )}
            {daysUntil !== null && (
              <span className={`text-xs flex items-center gap-1 ${daysUntil <= 0 ? 'text-red-400' : daysUntil <= 2 ? 'text-yellow-400' : 'text-gray-400'}`}>
                <FiClock size={9} /> {daysUntil <= 0 ? 'Overdue!' : `Fails in ${daysUntil}d`}
              </span>
            )}
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="mt-1 flex-shrink-0">
          <FiChevronDown size={15} className="text-gray-500" />
        </motion.div>
      </button>

      {/* ML confidence bar — animated with glow */}
      {alert.mlConfidence > 0 && (
        <div className="px-5 -mt-1 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full relative"
                initial={{ width: 0 }} animate={{ width: `${alert.mlConfidence * 100}%` }}
                transition={{ duration: 1.2, delay: idx * 0.06 + 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ background: `linear-gradient(90deg, ${sev.text}55, ${sev.text})`, boxShadow: `0 0 6px ${sev.text}` }}
              />
            </div>
            <motion.span
              className="text-[9px] font-bold flex-shrink-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.06 + 0.6 }}
              style={{ color: sev.text }}>
              {Math.round(alert.mlConfidence * 100)}%
            </motion.span>
          </div>
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}>
            <div className="px-5 pb-5 pt-4 border-t border-white/[0.06] space-y-4">

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ['Location',    alert.targetRef   || 'â€”'],
                  ['Target Type', alert.targetType  || 'â€”'],
                  ['Assigned To', alert.assignedTo?.name || 'Unassigned'],
                  ['Opened',      new Date(alert.createdAt).toLocaleString()],
                  ...(alert.predictedFailureDate ? [['Predicted Fail', new Date(alert.predictedFailureDate).toLocaleDateString()]] : []),
                  ...(alert.resolvedAt ? [['Resolved At', new Date(alert.resolvedAt).toLocaleString()]] : []),
                  ...(alert.resolutionNote ? [['Resolution Note', alert.resolutionNote]] : []),
                ].filter(([, v]) => v && v !== 'â€”').map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wide">{k}</span>
                    <span className="text-gray-200 text-xs">{v}</span>
                  </div>
                ))}
              </div>

              {/* Status updater */}
              {!isDone && nextOpts.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest">Update Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nextOpts.map(s => (
                      <button key={s} onClick={() => setNewStatus(s)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: newStatus === s ? `${STATUS_COLORS[s]}22` : 'rgba(255,255,255,0.05)',
                          color:      newStatus === s ? STATUS_COLORS[s]         : '#9ca3af',
                          border:     newStatus === s ? `1px solid ${STATUS_COLORS[s]}50` : '1px solid rgba(255,255,255,0.08)',
                        }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Note textarea when resolving or dismissing */}
                  <AnimatePresence>
                    {(newStatus === 'resolved' || newStatus === 'dismissed') && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        <textarea
                          placeholder={newStatus === 'resolved' ? 'Describe the resolutionâ€¦' : 'Reason for dismissalâ€¦'}
                          value={note} onChange={e => setNote(e.target.value)}
                          rows={2} className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                          style={INPUT}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleUpdate}
                    disabled={saving || (newStatus === alert.status && !note.trim())}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                    style={{
                      background: (newStatus !== alert.status || note.trim())
                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.07)',
                      opacity: (newStatus === alert.status && !note.trim()) ? 0.45 : 1,
                      boxShadow: (newStatus !== alert.status) ? '0 0 14px rgba(139,92,246,0.25)' : 'none',
                    }}>
                    {saving
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-3 h-3 border border-white/30 border-t-white rounded-full" />
                      : <FiCheckCircle size={12} />}
                    Save Update
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// â”€â”€â”€ Create Alert Modal (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BLANK_FORM = { title: '', description: '', severity: 'warning', alertType: 'manual', targetType: 'facility', targetRef: '' }

function CreateAlertModal({ onClose, onCreated }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required')
      return
    }
    setSaving(true)
    try {
      await createMaintenanceAlert(form)
      toast.success('Alert created successfully')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create alert')
    } finally { setSaving(false) }
  }

  const lbl = 'text-gray-400 text-[10px] uppercase tracking-wide block mb-1.5'
  const inp = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl p-6"
        style={{ background: 'rgba(25,16,52,0.97)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <FiPlus className="text-purple-400" size={18} /> Create Maintenance Alert
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={lbl}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Sensor Bay A3 offline"
              className={inp} style={INPUT} />
          </div>
          <div>
            <label className={lbl}>Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detailâ€¦"
              rows={3} className={`${inp} resize-none`} style={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                className={inp} style={INPUT}>
                <option value="info"     className="bg-gray-900">Info</option>
                <option value="warning"  className="bg-gray-900">Warning</option>
                <option value="critical" className="bg-gray-900">Critical</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Alert Type</label>
              <select value={form.alertType} onChange={e => set('alertType', e.target.value)}
                className={inp} style={INPUT}>
                {ALERT_TYPES.map(t => (
                  <option key={t.value} value={t.value} className="bg-gray-900">{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Target Type</label>
              <select value={form.targetType} onChange={e => set('targetType', e.target.value)}
                className={inp} style={INPUT}>
                {['spot', 'sensor', 'facility', 'vehicle', 'system'].map(t => (
                  <option key={t} value={t} className="bg-gray-900">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Location / Ref</label>
              <input value={form.targetRef} onChange={e => set('targetRef', e.target.value)}
                placeholder="e.g. Bay A3, Floor 2"
                className={inp} style={INPUT} />
            </div>
          </div>

          {/* Severity preview strip */}
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: `${SEV[form.severity].text}0d`, border: `1px solid ${SEV[form.severity].text}30` }}>
            <span className="text-lg">{form.severity === 'critical' ? 'ðŸ”´' : form.severity === 'warning' ? 'ðŸŸ¡' : 'ðŸ”µ'}</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: SEV[form.severity].text }}>
                {SEV[form.severity].label} alert
              </p>
              <p className="text-gray-500 text-[10px]">
                {form.severity === 'critical' ? 'Immediate attention required' : form.severity === 'warning' ? 'Monitor and schedule maintenance' : 'Informational â€” no immediate action needed'}
              </p>
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            type="submit" disabled={saving}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 22px rgba(139,92,246,0.3)' }}>
            {saving
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <FiPlus size={14} />}
            {saving ? 'Creatingâ€¦' : 'Create Alert'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALL_SEVS     = ['all', 'critical', 'warning', 'info']
const ALL_STATUSES = ['all', ...STATUS_FLOW]

export default function Maintenance() {
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  const isAdmin  = user?.role === 'admin'

  const [summary,     setSummary]     = useState(null)
  const [alerts,      setAlerts]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [scanning,    setScanning]    = useState(false)
  const [showCreate,  setShowCreate]  = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // filters
  const [search,       setSearch]       = useState('')
  const [filterSev,    setFilterSev]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const [page,         setPage]         = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, alertRes] = await Promise.all([
        getMaintenanceSummary(),
        getMaintenanceAlerts(),
      ])
      setSummary(sumRes.data.data || null)
      setAlerts(alertRes.data.data || [])
      setLastRefresh(new Date())
    } catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpdate = useCallback(async (id, patch) => {
    const res = await updateMaintenanceAlert(id, patch)
    const updated = res.data.data
    setAlerts(prev => prev.map(a => a._id === id ? updated : a))
    return updated
  }, [])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await runPredictiveScan()
      toast.success(`Scan complete â€” ${res.data.data?.created ?? 0} new alert(s) raised`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed')
    } finally { setScanning(false) }
  }

  // client-side filtering
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return alerts.filter(a => {
      if (filterSev    !== 'all' && a.severity  !== filterSev)    return false
      if (filterStatus !== 'all' && a.status    !== filterStatus) return false
      if (filterType   !== 'all' && a.alertType !== filterType)   return false
      if (q && !a.title?.toLowerCase().includes(q) && !a.description?.toLowerCase().includes(q)) return false
      return true
    })
  }, [alerts, filterSev, filterStatus, filterType, search])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const alertTypes = useMemo(() => ['all', ...new Set(alerts.map(a => a.alertType).filter(Boolean))], [alerts])

  // reset page on filter change
  useEffect(() => { setPage(1) }, [search, filterSev, filterStatus, filterType])

  const hasFilters = search || filterSev !== 'all' || filterStatus !== 'all' || filterType !== 'all'

  // derived chart values
  const infoCount = summary ? Math.max(0, summary.open - (summary.critical || 0) - (summary.warning || 0)) : 0
  const totalActive = (summary?.open || 0) + (summary?.inProgress || 0)
  const resolutionPct = summary && (totalActive + (summary?.resolved || 0)) > 0
    ? Math.round((summary.resolved / (totalActive + summary.resolved)) * 100) : null

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Animated ambient orbs */}
      <motion.div
        className="fixed bottom-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(circle,#ef4444,transparent)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.1, 0.06], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed top-1/4 right-1/5 w-80 h-80 rounded-full pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }}
        animate={{ scale: [1, 1.3, 0.9, 1], opacity: [0.04, 0.08, 0.04], x: [0, -20, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="fixed top-3/4 right-1/3 w-64 h-64 rounded-full pointer-events-none blur-3xl"
        style={{ background: 'radial-gradient(circle,#f59e0b,transparent)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => <FloatingParticle key={i} {...p} />)}
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center gap-3"
        style={{ background: 'rgba(15,12,41,0.90)', backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <FiArrowLeft size={17} /> Dashboard
        </motion.button>
        <div className="w-px h-4 bg-white/10" />
        <FiTool className="text-purple-400" size={16} />
        <span className="text-white font-bold text-sm">Predictive Maintenance</span>

        {/* Live indicator */}
        <motion.span
          className="flex items-center gap-1.5 text-gray-500 text-xs px-2 py-1 rounded-lg"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
          animate={{ borderColor: ['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.4)', 'rgba(16,185,129,0.15)'] }}
          transition={{ duration: 3, repeat: Infinity }}>
          <span className="relative flex h-1.5 w-1.5">
            <motion.span
              animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-green-400" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
          </span>
          <span className="text-green-400 font-medium">Live</span>
          <span className="text-gray-600">·</span>
          <motion.span
            key={lastRefresh.toLocaleTimeString()}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="tabular-nums">
            {lastRefresh.toLocaleTimeString()}
          </motion.span>
        </motion.span>

        <div className="ml-auto flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.07 }} onClick={load}
            className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <FiRefreshCw size={14} />
          </motion.button>
          {isAdmin && (
            <>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <FiPlus size={14} /> New Alert
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={handleScan} disabled={scanning}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 18px rgba(139,92,246,0.3)' }}>
                {scanning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}>Scanning…</motion.span>
                  </>
                ) : (
                  <>
                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <FiCpu size={14} />
                    </motion.div>
                    Run ML Scan
                  </>
                )}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className="mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-3xl font-black text-white">Maintenance Alerts</h1>
            {/* Animated title underline */}
            <motion.div
              className="mb-1.5 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ef4444)' }}
              initial={{ width: 0 }} animate={{ width: 120 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
          <p className="text-gray-400 mt-1 text-sm">ML-powered predictive maintenance and real-time fleet health monitoring.</p>
        </motion.div>

        {/* Scan beam overlay — appears while scanning */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-30">
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #6366f1, transparent)', boxShadow: '0 0 12px #8b5cf6' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 50%)' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ 6 KPI stat cards â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Open"        value={summary?.open}       color="#ef4444" icon={<FiAlertCircle size={20} />} delay={0}    />
          <StatCard label="Critical"    value={summary?.critical}   color="#f97316" icon={<FiAlertTriangle size={20} />} delay={0.05} />
          <StatCard label="Warning"     value={summary?.warning}    color="#f59e0b" icon={<FiBell size={20} />} delay={0.1}  />
          <StatCard label="In Progress" value={summary?.inProgress} color="#6366f1" icon={<FiTool size={20} />} delay={0.15} />
          <StatCard label="Resolved"    value={summary?.resolved}   color="#10b981" icon={<FiCheckCircle size={20} />} delay={0.2}  />
          <StatCard label="Archived"    value={summary?.dismissed}  color="#6b7280" icon={<FiClock size={20} />} delay={0.25} />
        </div>

        {/* â”€â”€ Two-column layout â”€â”€ */}
        <div className="flex flex-col xl:flex-row gap-6">

          {/* â”€â”€ LEFT: filters + alert list â”€â”€ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Filter bar */}
            <div className="rounded-2xl p-4 space-y-3" style={GLS}>
              {/* Search */}
              <div className="relative">
                <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text" placeholder="Search by title or descriptionâ€¦"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
                  style={INPUT}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <FiX size={13} />
                  </button>
                )}
              </div>

              {/* Severity chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide mr-1">Severity</span>
                {ALL_SEVS.map(s => {
                  const col = s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : s === 'info' ? '#818cf8' : '#8b5cf6'
                  const active = filterSev === s
                  return (
                    <button key={s} onClick={() => setFilterSev(s)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={{
                        background: active ? `${col}20` : 'rgba(255,255,255,0.05)',
                        color:      active ? col : '#9ca3af',
                        border:     active ? `1px solid ${col}45` : '1px solid rgba(255,255,255,0.07)',
                      }}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  )
                })}
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-gray-500 text-[10px] uppercase tracking-wide mr-1">Status</span>
                {ALL_STATUSES.map(s => {
                  const col = s === 'all' ? '#8b5cf6' : STATUS_COLORS[s]
                  const active = filterStatus === s
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: active ? `${col}20` : 'rgba(255,255,255,0.05)',
                        color:      active ? col : '#9ca3af',
                        border:     active ? `1px solid ${col}45` : '1px solid rgba(255,255,255,0.07)',
                      }}>
                      {s === 'all' ? 'All' : STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>

              {/* Alert type chips */}
              {alertTypes.length > 1 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-gray-500 text-[10px] uppercase tracking-wide mr-1">Type</span>
                  {alertTypes.map(t => {
                    const active = filterType === t
                    return (
                      <button key={t} onClick={() => setFilterType(t)}
                        className="px-2.5 py-1 rounded-lg text-xs capitalize transition-all"
                        style={{
                          background: active ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                          color:      active ? '#c4b5fd' : '#6b7280',
                          border:     active ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                        {t === 'all' ? 'ðŸ”” All Types' : `${alertTypeIcon(t)} ${alertTypeLabel(t)}`}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Count + clear */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-gray-500 text-xs">
                  {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
                  {pageCount > 1 && ` Â· page ${page} / ${pageCount}`}
                </span>
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setFilterSev('all'); setFilterStatus('all'); setFilterType('all') }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors">
                    <FiX size={11} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Alert list */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="h-28 rounded-2xl relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.4, delay: i * 0.15, repeat: Infinity, repeatDelay: 0.4 }}
                    />
                  </motion.div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl py-20 text-center" style={GLS}>
                <FiCheckCircle className="text-green-400 mx-auto mb-3" size={44} />
                <p className="text-white font-bold text-xl mb-1">
                  {alerts.length === 0 ? '✅ All Systems Operational' : 'No alerts match your filters'}
                </p>
                <p className="text-gray-500 text-sm">
                  {alerts.length === 0 && isAdmin ? 'Run a predictive ML scan to detect potential issues.' : 'Try adjusting your filters above.'}
                </p>
                {alerts.length === 0 && isAdmin && (
                  <motion.button whileHover={{ scale: 1.03 }} onClick={handleScan} disabled={scanning}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white mx-auto"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <FiCpu size={14} /> Run Predictive Scan
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div className="space-y-3"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                initial="hidden" animate="show">
                {paginated.map((a, i) => (
                  <AlertCard key={a._id} alert={a} onUpdate={handleUpdate} isAdmin={isAdmin} idx={i} />
                ))}

                {/* Pagination */}
                {pageCount > 1 && (
                  <motion.div layout className="flex items-center justify-center gap-1.5 pt-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>â† Prev</button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: page === n ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                          color: page === n ? '#fff' : '#9ca3af',
                        }}>{n}</button>
                    ))}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>Next →</motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* â”€â”€ RIGHT: charts sidebar â”€â”€ */}
          <div className="xl:w-72 flex-shrink-0 space-y-5">

            {/* Severity donut */}
            <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 22 }}
              className="rounded-2xl p-5 relative overflow-hidden" style={GLS}>
              {/* Subtle animated border sweep */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.08), transparent)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
              />
              <h3 className="text-white font-bold text-sm mb-0.5">Severity Distribution</h3>
              <p className="text-gray-500 text-xs mb-3">Active alerts by severity level</p>
              <SeverityDonut critical={summary?.critical} warning={summary?.warning} info={infoCount} />
              {summary && (summary.critical > 0 || summary.warning > 0 || infoCount > 0) && (
                <div className="mt-3 space-y-1.5">
                  {[['Critical', '#ef4444', summary.critical], ['Warning', '#f59e0b', summary.warning], ['Info', '#818cf8', infoCount]]
                    .filter(([,, v]) => v > 0).map(([l, c, v]) => (
                    <div key={l} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
                        <span className="text-gray-400">{l}</span>
                      </span>
                      <span className="font-bold" style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Status bar chart */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl p-5" style={GLS}>
              <h3 className="text-white font-bold text-sm mb-0.5">Status Overview</h3>
              <p className="text-gray-500 text-xs mb-3">Alert lifecycle breakdown</p>
              <StatusBars summary={summary} />
            </motion.div>

            {/* Live activity feed */}
            {summary?.recentAlerts?.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 22 }}
                className="rounded-2xl p-5 relative overflow-hidden" style={GLS}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                      <FiBell size={13} className="text-purple-400" />
                    </motion.div>
                    Live Priority Feed
                  </h3>
                  <motion.span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}>
                    LIVE
                  </motion.span>
                </div>
                <div className="space-y-1.5">
                  {summary.recentAlerts.slice(0, 5).map((a, feedIdx) => {
                    const s = SEV[a.severity] || SEV.info
                    return (
                      <motion.div
                        key={a._id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + feedIdx * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                        whileHover={{ x: 3 }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-default"
                        style={{ background: `${s.text}07`, border: `1px solid ${s.text}18` }}>
                        <PulseDot color={s.text} pulse={a.severity === 'critical'} />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-semibold line-clamp-1">{a.title}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{a.targetRef || a.targetType || '—'}</p>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: `${s.text}18`, color: s.text }}>{s.label}</span>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Health metrics with progress bars */}
            <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 22 }}
              className="rounded-2xl p-5" style={GLS}>
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-1.5">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
                  <FiActivity size={13} className="text-purple-400" />
                </motion.div>
                Health Metrics
              </h3>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'Total alerts',    val: alerts.length,    color: '#c4b5fd', pct: null },
                  { label: 'Active',          val: totalActive,      color: '#f59e0b', pct: alerts.length ? Math.round(totalActive / alerts.length * 100) : 0 },
                  { label: 'In filter',       val: filtered.length,  color: '#818cf8', pct: alerts.length ? Math.round(filtered.length / alerts.length * 100) : 0 },
                  { label: 'Resolution rate', val: resolutionPct != null ? `${resolutionPct}%` : '—', color: '#10b981', pct: resolutionPct },
                ].map(({ label, val, color, pct }, mi) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">{label}</span>
                      <motion.span key={String(val)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="font-bold" style={{ color }}>{val}</motion.span>
                    </div>
                    {pct !== null && (
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{ duration: 1, delay: 0.3 + mi * 0.1, ease: 'easeOut' }}
                          style={{ background: `linear-gradient(90deg, ${color}66, ${color})` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Admin panel tip (animated) */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 22 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(139,92,246,0.12) 50%, transparent 70%)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                />
                <div className="flex items-center gap-2 mb-1">
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                  <p className="text-purple-300 text-xs font-semibold">Admin Mode Active</p>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Create alerts manually, run ML scans, and update any alert status.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create Alert Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateAlertModal onClose={() => setShowCreate(false)} onCreated={load} />
        )}
      </AnimatePresence>
    </div>
  )
}

