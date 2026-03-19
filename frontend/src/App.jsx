import React, { useContext, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

const Login         = lazy(() => import('./pages/Login.jsx'))
const Register      = lazy(() => import('./pages/Register.jsx'))
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'))
const Payment       = lazy(() => import('./pages/Payment.jsx'))
const PreBooking    = lazy(() => import('./pages/PreBooking.jsx'))
const AdminPanel    = lazy(() => import('./pages/AdminPanel.jsx'))
const AdminSetup    = lazy(() => import('./pages/AdminSetup.jsx'))
const Rentals       = lazy(() => import('./pages/Rentals.jsx'))
const MyRentalBookings = lazy(() => import('./pages/MyRentalBookings.jsx'))
const Maintenance   = lazy(() => import('./pages/Maintenance.jsx'))
const LiveMap       = lazy(() => import('./pages/LiveMap.jsx'))
const Inspection    = lazy(() => import('./pages/Inspection.jsx'))
const BankConnection = lazy(() => import('./pages/BankConnection.jsx'))

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-purple-300 font-semibold">Loading…</p>
    </div>
  </div>
)

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useContext(AuthContext)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppContent() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard"       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/payment"         element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/bank-connection" element={<ProtectedRoute><BankConnection /></ProtectedRoute>} />
        <Route path="/prebooking"      element={<ProtectedRoute><PreBooking /></ProtectedRoute>} />
        <Route path="/livemap"         element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
        <Route path="/inspection"      element={<ProtectedRoute><Inspection /></ProtectedRoute>} />
        <Route path="/rentals"         element={<ProtectedRoute><Rentals /></ProtectedRoute>} />
        <Route path="/my-rental-bookings" element={<ProtectedRoute><MyRentalBookings /></ProtectedRoute>} />
        <Route path="/maintenance"     element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/admin"           element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin-setup"     element={<AdminSetup />} />
        <Route path="/"                element={<Navigate to="/login" replace />} />
        <Route path="*"                element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-right" toastOptions={{ style: { background: 'rgba(30,27,60,0.95)', color: '#fff', border: '1px solid rgba(139,92,246,0.4)', backdropFilter: 'blur(12px)' } }} />
      </AuthProvider>
    </Router>
  )
}

export default App
