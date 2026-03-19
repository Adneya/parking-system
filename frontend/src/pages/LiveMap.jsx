import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  FiArrowLeft, FiRefreshCw, FiActivity, FiCheckCircle,
  FiAlertCircle, FiWifi, FiWifiOff, FiBattery, FiFilter,
  FiMapPin, FiNavigation,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getFloorMap, getSensorStats, getSpots } from '../services/api'

const BG = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GLS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.08)' }

const VEHICLE_ICONS = { motorcycle: '🏍️', car: '🚗', suv: '🚙', truck: '🚛', ev: '⚡', empty: '—' }
const TYPE_COLORS = {
  standard:    '#6366f1',
  compact:     '#8b5cf6',
  large:       '#a855f7',
  motorcycle:  '#ec4899',
  ev:          '#10b981',
  disabled:    '#f59e0b',
  vip:         '#f97316',
}

function BatteryIcon({ level }) {
  const color = level > 50 ? '#10b981' : level > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1">
      <FiBattery size={12} style={{ color }} />
      <span style={{ color, fontSize: 10 }}>{level}%</span>
    </div>
  )
}

function PulseRing({ color }) {
  return (
    <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
      animate={{ opacity: [0.6, 0], scale: [1, 1.4] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
      style={{ border: `2px solid ${color}`, borderRadius: 12 }} />
  )
}

function SpotTile({ spot }) {
  const occupied = spot.sensor?.isOccupied || spot.isOccupied
  const faulty   = spot.sensor?.sensorFaulty
  const battery  = spot.sensor?.batteryLevel ?? 100
  const weight   = spot.sensor?.currentWeight
  const inferred = spot.sensor?.inferredType || (occupied ? 'car' : 'empty')
  const statusColor = faulty ? '#f59e0b' : occupied ? '#ef4444' : '#10b981'
  const typeColor   = TYPE_COLORS[spot.type] || '#6366f1'

  return (
    <motion.div className="relative rounded-xl p-3 flex flex-col gap-1 select-none min-w-0"
      whileHover={{ scale: 1.04, zIndex: 10 }}
      style={{
        background: occupied
          ? 'rgba(239,68,68,0.12)'
          : faulty
          ? 'rgba(245,158,11,0.1)'
          : 'rgba(16,185,129,0.08)',
        border: `1px solid ${occupied ? 'rgba(239,68,68,0.35)' : faulty ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)'}`,
        boxShadow: occupied ? '0 0 12px rgba(239,68,68,0.15)' : '0 0 8px rgba(16,185,129,0.1)',
        cursor: 'default',
      }}>
      {occupied && !faulty && <PulseRing color={statusColor} />}

      {/* Status dot */}
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />

      <p className="text-white font-bold text-sm truncate">{spot.spotNumber}</p>
      <p className="text-xs truncate" style={{ color: typeColor }}>{spot.zone} · {spot.type}</p>

      {spot.floor !== undefined && (
        <p className="text-gray-500 text-xs">Fl {spot.floor ?? 'G'}</p>
      )}

      {occupied && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-sm">{VEHICLE_ICONS[inferred] || '🚗'}</span>
          {weight !== undefined && <span className="text-gray-400 text-xs">{weight}kg</span>}
        </div>
      )}
      {!occupied && !faulty && <span className="text-green-400 text-xs font-semibold">Free</span>}
      {faulty && <span className="text-yellow-400 text-xs font-semibold">⚠ Fault</span>}

      {battery < 30 && <BatteryIcon level={battery} />}
    </motion.div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex items-center gap-4" style={GLS}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
        <p className="text-gray-400 text-xs mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

const ZONES = ['All', 'A', 'B', 'C', 'D', 'E']
const FLOORS = ['All', '0', '1', '2', '3']
const STATUSES = ['All', 'free', 'occupied', 'faulty']

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const toRad = (deg) => (deg * Math.PI) / 180
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function toCartesianKm(lat, lon) {
  const latKm = lat * 111.32
  const lonKm = lon * (111.32 * Math.cos(toRad(lat)))
  return { x: lonKm, y: latKm }
}

function pointToSegmentDistanceKm(point, start, end) {
  const p = toCartesianKm(point.lat, point.lng)
  const a = toCartesianKm(start.lat, start.lng)
  const b = toCartesianKm(end.lat, end.lng)

  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const ab2 = abx * abx + aby * aby

  if (ab2 === 0) {
    const dx = p.x - a.x
    const dy = p.y - a.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  const closest = { x: a.x + t * abx, y: a.y + t * aby }
  const dx = p.x - closest.x
  const dy = p.y - closest.y
  return Math.sqrt(dx * dx + dy * dy)
}

export default function LiveMap() {
  const navigate = useNavigate()
  const [spots, setSpots]   = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [live, setLive]   = useState(true)
  const [filterZone,   setFilterZone]   = useState('All')
  const [filterFloor,  setFilterFloor]  = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [cityQuery, setCityQuery] = useState('Pune')
  const [citySpots, setCitySpots] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [mapError, setMapError] = useState('')
  const [sourceAddress, setSourceAddress] = useState('My Location')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [sourcePoint, setSourcePoint] = useState(null)
  const [destinationPoint, setDestinationPoint] = useState(null)
  const [routeSpots, setRouteSpots] = useState([])
  const [suggestedSpotIds, setSuggestedSpotIds] = useState([])
  const intervalRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const [mapRes, statsRes] = await Promise.allSettled([getFloorMap(), getSensorStats()])
      if (mapRes.status === 'fulfilled') {
        setSpots(mapRes.value.data.data || [])
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data || null)
      } else {
        setStats(null)
      }
      setLastUpdate(new Date())
    } catch (_) {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchCitySpots = useCallback(async (city) => {
    if (!city.trim()) {
      setCitySpots([])
      return
    }
    setCityLoading(true)
    try {
      const res = await getSpots({ city, limit: 200, available: 'true' })
      setCitySpots(res.data?.spots || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch city spots')
    } finally {
      setCityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setMapError('')
      },
      () => setMapError('Location access denied. Distance ranking uses city center only.'),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }, [])

  useEffect(() => {
    fetchCitySpots(cityQuery)
  }, [cityQuery, fetchCitySpots])

  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(fetchData, 5000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [live, fetchData])

  const filteredSpots = spots.filter(s => {
    const occupied = s.sensor?.isOccupied || s.isOccupied
    const faulty   = s.sensor?.sensorFaulty
    if (filterZone   !== 'All' && s.zone    !== filterZone)  return false
    if (filterFloor  !== 'All' && String(s.floor ?? 0) !== filterFloor) return false
    if (filterStatus !== 'All') {
      if (filterStatus === 'occupied' && !occupied) return false
      if (filterStatus === 'free'     && (occupied || faulty)) return false
      if (filterStatus === 'faulty'   && !faulty) return false
    }
    return true
  })

  const totalOccupied = spots.filter(s => s.sensor?.isOccupied || s.isOccupied).length
  const totalFree     = spots.filter(s => !(s.sensor?.isOccupied || s.isOccupied) && !s.sensor?.sensorFaulty).length
  const totalFaulty   = spots.filter(s => s.sensor?.sensorFaulty).length
  const occupancyPct  = spots.length ? Math.round((totalOccupied / spots.length) * 100) : 0

  const citySpotsWithDistance = citySpots.map((s) => {
    const [lng, lat] = s.location?.coordinates || []
    const hasCoords = typeof lat === 'number' && typeof lng === 'number'
    let distanceKm = null
    if (userLocation && hasCoords) {
      distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, lat, lng)
    }
    return { ...s, lat, lng, hasCoords, distanceKm }
  }).sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0
    if (a.distanceKm == null) return 1
    if (b.distanceKm == null) return -1
    return a.distanceKm - b.distanceKm
  })

  const resolveAddressPoint = useCallback((rawText) => {
    const query = String(rawText || '').trim().toLowerCase()
    if (!query) return null

    if (['my location', 'current location', 'my current location', 'me'].includes(query)) {
      if (!userLocation) return null
      return { lat: userLocation.lat, lng: userLocation.lng, label: 'My Location' }
    }

    const spotHit = citySpotsWithDistance.find((s) => {
      if (!s.hasCoords) return false
      const text = `${s.name || ''} ${s.address || ''} ${s.city || ''}`.toLowerCase()
      return text.includes(query)
    })
    if (spotHit) {
      return { lat: spotHit.lat, lng: spotHit.lng, label: spotHit.name }
    }

    const cityMatches = citySpotsWithDistance.filter((s) => s.hasCoords && String(s.city || '').toLowerCase().includes(query))
    if (cityMatches.length) {
      const avgLat = cityMatches.reduce((sum, s) => sum + s.lat, 0) / cityMatches.length
      const avgLng = cityMatches.reduce((sum, s) => sum + s.lng, 0) / cityMatches.length
      return { lat: avgLat, lng: avgLng, label: query }
    }

    return null
  }, [citySpotsWithDistance, userLocation])

  const handleRouteSearch = useCallback(() => {
    const src = resolveAddressPoint(sourceAddress)
    const dst = resolveAddressPoint(destinationAddress)
    if (!src || !dst) {
      toast.error('Could not resolve source/destination. Try city or nearby area names.')
      return
    }

    const corridorSpots = citySpotsWithDistance
      .filter((s) => s.hasCoords)
      .map((s) => {
        const routeDistanceKm = pointToSegmentDistanceKm({ lat: s.lat, lng: s.lng }, src, dst)
        const directDistanceKm = userLocation ? getDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng) : null
        const score = routeDistanceKm * 0.7 + (directDistanceKm == null ? 0 : directDistanceKm * 0.3)
        return { ...s, routeDistanceKm, directDistanceKm, routeScore: score }
      })
      .filter((s) => s.routeDistanceKm <= 3)
      .sort((a, b) => a.routeScore - b.routeScore)

    const fallback = corridorSpots.length
      ? corridorSpots
      : citySpotsWithDistance
          .filter((s) => s.hasCoords)
          .map((s) => {
            const routeDistanceKm = pointToSegmentDistanceKm({ lat: s.lat, lng: s.lng }, src, dst)
            const directDistanceKm = userLocation ? getDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng) : null
            const score = routeDistanceKm * 0.7 + (directDistanceKm == null ? 0 : directDistanceKm * 0.3)
            return { ...s, routeDistanceKm, directDistanceKm, routeScore: score }
          })
          .sort((a, b) => a.routeScore - b.routeScore)

    const selected = fallback
    setSourcePoint(src)
    setDestinationPoint(dst)
    setRouteSpots(selected)
    setSuggestedSpotIds(selected.slice(0, 5).map((s) => s._id))
  }, [citySpotsWithDistance, destinationAddress, resolveAddressPoint, sourceAddress, userLocation])

  const clearRouteSearch = useCallback(() => {
    setSourcePoint(null)
    setDestinationPoint(null)
    setRouteSpots([])
    setSuggestedSpotIds([])
  }, [])

  const displayedMapSpots = routeSpots.length ? routeSpots : citySpotsWithDistance

  const mapCenter = (() => {
    if (sourcePoint) return [sourcePoint.lat, sourcePoint.lng]
    const firstWithCoords = citySpotsWithDistance.find((s) => s.hasCoords)
    if (firstWithCoords) return [firstWithCoords.lat, firstWithCoords.lng]
    if (userLocation) return [userLocation.lat, userLocation.lng]
    return [18.5204, 73.8567]
  })()

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Fixed orbs */}
      <div className="fixed top-1/3 left-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center gap-4"
        style={{ background: 'rgba(15,12,41,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <FiArrowLeft size={18} /> Dashboard
        </motion.button>
        <div className="flex items-center gap-2 ml-2">
          <motion.div animate={{ scale: live ? [1, 1.2, 1] : 1 }} transition={{ duration: 1.5, repeat: Infinity }}>
            <FiActivity className="text-green-400" size={16} />
          </motion.div>
          <span className="text-white font-bold text-sm">Live Parking Map</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {lastUpdate && (
            <span className="text-gray-500 text-xs hidden sm:block">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {/* Live toggle */}
          <button onClick={() => setLive(l => !l)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: live ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${live ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
              color: live ? '#10b981' : '#9ca3af',
            }}>
            {live ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
            {live ? 'Live' : 'Paused'}
          </button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={fetchData}
            className="p-2 rounded-lg text-gray-400 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <FiRefreshCw size={15} />
          </motion.button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Spots"   value={spots.length}  color="#8b5cf6" icon="🅿️" />
          <StatCard label="Occupied"      value={totalOccupied} color="#ef4444" icon="🚗" />
          <StatCard label="Available"     value={totalFree}     color="#10b981" icon="✅" />
          <StatCard label="Occupancy"     value={`${occupancyPct}%`} color="#f59e0b" icon="📊" />
        </div>

        {/* Occupancy bar */}
        {spots.length > 0 && (
          <div className="rounded-2xl p-5 mb-6" style={GLS}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold text-sm">Lot Occupancy</span>
              <span className="text-gray-400 text-sm">{totalOccupied}/{spots.length}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${occupancyPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ background: occupancyPct > 80 ? '#ef4444' : occupancyPct > 60 ? '#f59e0b' : '#10b981' }} />
            </div>
            <div className="flex gap-4 mt-3">
              {[['#10b981','Free'],['#ef4444','Occupied'],['#f59e0b','Faulty']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} /> {l}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl p-5 mb-6" style={GLS}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="text-gray-400 text-xs mb-1 block">Search City</label>
              <input
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
              />
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              onClick={() => fetchCitySpots(cityQuery)}
              className="px-5 py-3 rounded-xl text-white font-semibold"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              Search Parking Areas
            </motion.button>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Source Address</label>
                <input
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder="e.g. My Location or Shivajinagar Pune"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Destination Address</label>
                <input
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="e.g. Hinjewadi Pune"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder-gray-500"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                />
              </div>
            </div>
            <div className="w-full flex flex-wrap gap-2 mt-2">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                onClick={handleRouteSearch}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                Show Parking Between Route
              </motion.button>
              <button
                onClick={clearRouteSearch}
                className="px-4 py-2 rounded-xl text-gray-200 text-sm font-semibold border border-white/20 bg-white/5">
                Clear Route
              </button>
              {routeSpots.length > 0 && (
                <span className="text-xs text-cyan-300 self-center">{routeSpots.length} parking areas found between source and destination</span>
              )}
            </div>
            <div className="text-xs text-gray-400 ml-auto">
              <span className="font-semibold text-gray-300">My coordinates:</span>{' '}
              {userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : 'Not available'}
            </div>
          </div>
          {mapError && <p className="text-yellow-400 text-xs mt-2">{mapError}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={GLS}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <p className="text-white font-semibold flex items-center gap-2"><FiMapPin /> {cityQuery || 'City'} parking map</p>
              <p className="text-xs text-gray-400">{cityLoading ? 'Loading...' : `${displayedMapSpots.length} spot(s)`}</p>
            </div>
            <div className="h-[430px]">
              <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userLocation && (
                  <>
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                      <Popup>
                        <div>
                          <strong>Your Location</strong>
                          <br />
                          {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                        </div>
                      </Popup>
                    </Marker>
                    <Circle center={[userLocation.lat, userLocation.lng]} radius={800} pathOptions={{ color: '#10b981', fillOpacity: 0.08 }} />
                  </>
                )}
                {sourcePoint && destinationPoint && (
                  <>
                    <Marker position={[sourcePoint.lat, sourcePoint.lng]}>
                      <Popup><strong>Source:</strong> {sourcePoint.label || sourceAddress}</Popup>
                    </Marker>
                    <Marker position={[destinationPoint.lat, destinationPoint.lng]}>
                      <Popup><strong>Destination:</strong> {destinationPoint.label || destinationAddress}</Popup>
                    </Marker>
                    <Polyline positions={[[sourcePoint.lat, sourcePoint.lng], [destinationPoint.lat, destinationPoint.lng]]} pathOptions={{ color: '#22d3ee', weight: 4, opacity: 0.8 }} />
                  </>
                )}
                {displayedMapSpots.filter((s) => s.hasCoords).map((s) => {
                  const suggested = suggestedSpotIds.includes(s._id)
                  return (
                  <Marker key={s._id} position={[s.lat, s.lng]}>
                    <Popup>
                      <div>
                        <strong>{suggested ? 'Recommended: ' : ''}{s.name}</strong>
                        <br />
                        {s.city}
                        <br />
                        {s.address}
                        <br />
                        Rate: INR {s.hourlyRate}/hr
                        <br />
                        Free: {s.availableSpots}/{s.totalSpots}
                        <br />
                        Distance: {s.distanceKm != null ? `${s.distanceKm.toFixed(2)} km` : 'N/A'}
                        <br />
                        Route fit: {s.routeDistanceKm != null ? `${s.routeDistanceKm.toFixed(2)} km from route` : 'N/A'}
                      </div>
                    </Popup>
                  </Marker>
                  )
                })}
                {displayedMapSpots.filter((s) => s.hasCoords && suggestedSpotIds.includes(s._id)).map((s) => (
                  <Circle
                    key={`suggested-${s._id}`}
                    center={[s.lat, s.lng]}
                    radius={220}
                    pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.08 }}
                  />
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={GLS}>
            <p className="text-white font-semibold flex items-center gap-2 mb-3"><FiNavigation /> Distance-based suggestions</p>
            <div className="space-y-2 max-h-[390px] overflow-auto pr-1">
              {displayedMapSpots.slice(0, 10).map((s, i) => {
                const suggested = suggestedSpotIds.includes(s._id)
                return (
                <div key={s._id} className="rounded-xl p-3 border" style={{
                  borderColor: suggested ? 'rgba(34,211,238,0.65)' : 'rgba(255,255,255,0.1)',
                  background: suggested ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.05)',
                }}>
                  <p className="text-white text-sm font-semibold">{suggested ? `⭐ Suggested #${i + 1}` : `#${i + 1}`} {s.name}</p>
                  <p className="text-gray-400 text-xs">{s.address}</p>
                  <p className="text-gray-300 text-xs mt-1">Distance: {s.distanceKm != null ? `${s.distanceKm.toFixed(2)} km` : 'N/A'}</p>
                  {s.routeDistanceKm != null && <p className="text-cyan-300 text-xs">Route fit: {s.routeDistanceKm.toFixed(2)} km</p>}
                  <p className="text-purple-300 text-xs">Rate: INR {s.hourlyRate}/hr</p>
                </div>
              )})}
              {!cityLoading && displayedMapSpots.length === 0 && (
                <p className="text-gray-400 text-sm">No parking areas found for this city.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Zone',   options: ZONES,    value: filterZone,   set: setFilterZone },
            { label: 'Floor',  options: FLOORS,   value: filterFloor,  set: setFilterFloor },
            { label: 'Status', options: STATUSES, value: filterStatus, set: setFilterStatus },
          ].map(({ label, options, value, set }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-gray-500 text-xs"><FiFilter size={12} /> {label}:</span>
              <div className="flex gap-1">
                {options.map(o => (
                  <button key={o} onClick={() => set(o)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: value === o ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                      color:      value === o ? '#fff' : '#9ca3af',
                      border:     value === o ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <span className="text-gray-500 text-xs self-center ml-auto">{filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : filteredSpots.length === 0 ? (
          <div className="text-center py-20">
            <FiAlertCircle className="mx-auto text-yellow-400 mb-4" size={48} />
            <p className="text-white font-bold text-xl">No spots match your filters</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            <AnimatePresence>
              {filteredSpots.map(s => (
                <motion.div key={s._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SpotTile spot={s} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Vehicle legend */}
        <div className="mt-8 rounded-2xl p-5" style={GLS}>
          <p className="text-gray-400 text-xs font-semibold uppercase mb-3">Vehicle Type Legend</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(VEHICLE_ICONS).filter(([k]) => k !== 'empty').map(([k, icon]) => (
              <div key={k} className="flex items-center gap-2 text-gray-300 text-xs">
                <span className="text-base">{icon}</span> {k.charAt(0).toUpperCase() + k.slice(1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
