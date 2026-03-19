import React, { createContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api'

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  isAuthenticated: false,
  error: null,
  login: () => {},
  logout: () => {},
  register: () => {}
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(!!token)
  const [error, setError] = useState(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      setIsAuthenticated(true)
    }
  }, [])

  // Register user
  const register = useCallback(async (userData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.post('/users/register', userData)
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        setToken(response.data.token)
        setUser(response.data.user)
        setIsAuthenticated(true)
      }
      
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Login user
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.post('/users/login', { email, password })
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        setToken(response.data.token)
        setUser(response.data.user)
        setIsAuthenticated(true)
      }
      
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout user
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await api.post('/users/logout')
      
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setError(null)
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get user profile
  const getProfile = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/profile')
      setUser(response.data.user)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      return response.data.user
    } catch (err) {
      console.error('Get profile error:', err)
      setError(err.response?.data?.message || 'Failed to get profile')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true)
      const response = await api.put('/users/profile', profileData)
      setUser(response.data.user)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    try {
      setLoading(true)
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        passwordConfirm: confirmPassword
      })
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get user analytics
  const getAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/analytics')
      return response.data.analytics
    } catch (err) {
      console.error('Get analytics error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get loyalty information
  const getLoyalty = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/loyalty')
      return response.data.loyalty
    } catch (err) {
      console.error('Get loyalty error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Add loyalty points
  const addLoyaltyPoints = useCallback(async (points) => {
    try {
      setLoading(true)
      const response = await api.post('/users/loyalty/add-points', { points })
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add loyalty points'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Redeem loyalty points
  const redeemLoyaltyPoints = useCallback(async (points) => {
    try {
      setLoading(true)
      const response = await api.post('/users/loyalty/redeem', { points })
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to redeem loyalty points'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Add vehicle
  const addVehicle = useCallback(async (vehicleData) => {
    try {
      setLoading(true)
      const response = await api.post('/users/vehicles', vehicleData)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add vehicle'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get vehicles
  const getVehicles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/vehicles')
      return response.data.vehicles
    } catch (err) {
      console.error('Get vehicles error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Update vehicle
  const updateVehicle = useCallback(async (vehicleId, vehicleData) => {
    try {
      setLoading(true)
      const response = await api.put(`/users/vehicles/${vehicleId}`, vehicleData)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update vehicle'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete vehicle
  const deleteVehicle = useCallback(async (vehicleId) => {
    try {
      setLoading(true)
      const response = await api.delete(`/users/vehicles/${vehicleId}`)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete vehicle'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Add payment method
  const addPaymentMethod = useCallback(async (paymentData) => {
    try {
      setLoading(true)
      const response = await api.post('/users/payment-methods', paymentData)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add payment method'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Parking Spots ─────────────────────────────────────────────────────────
  const getSpots = useCallback(async (params = {}) => {
    try {
      const response = await api.get('/parking/spots', { params })
      return response.data
    } catch (err) {
      console.error('Get spots error:', err)
      throw err
    }
  }, [])

  const seedSpots = useCallback(async () => {
    try {
      const response = await api.post('/parking/spots/seed')
      return response.data
    } catch (err) {
      console.error('Seed spots error:', err)
      throw err
    }
  }, [])

  // ── Parking Sessions ──────────────────────────────────────────────────────
  const startSession = useCallback(async (data) => {
    try {
      setLoading(true)
      const response = await api.post('/parking/sessions/start', data)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to start session'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const endSession = useCallback(async (sessionId) => {
    try {
      setLoading(true)
      const response = await api.put(`/parking/sessions/${sessionId}/end`)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to end session'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelSession = useCallback(async (sessionId) => {
    try {
      setLoading(true)
      const response = await api.put(`/parking/sessions/${sessionId}/cancel`)
      return response.data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to cancel session'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getActiveSession = useCallback(async () => {
    try {
      const response = await api.get('/parking/sessions/active')
      return response.data.session
    } catch (err) {
      console.error('Get active session error:', err)
      return null
    }
  }, [])

  const getSessionHistory = useCallback(async (params = {}) => {
    try {
      const response = await api.get('/parking/sessions/history', { params })
      return response.data
    } catch (err) {
      console.error('Get session history error:', err)
      throw err
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated,
    error,
    
    // Auth methods
    register,
    login,
    logout,
    
    // User management
    getProfile,
    updateProfile,
    changePassword,
    
    // Analytics
    getAnalytics,
    
    // Loyalty
    getLoyalty,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
    
    // Vehicles
    addVehicle,
    getVehicles,
    updateVehicle,
    deleteVehicle,
    
    // Payment methods
    addPaymentMethod,

    // Parking spots
    getSpots,
    seedSpots,

    // Parking sessions
    startSession,
    endSession,
    cancelSession,
    getActiveSession,
    getSessionHistory,
    
    // Utils
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext

