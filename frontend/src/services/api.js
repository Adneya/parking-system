import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear localStorage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access denied');
    }
    
    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error');
    }
    
    return Promise.reject(error);
  }
);

// ============== AUTH API CALLS ==============

// Register
export const registerUser = (userData) => {
  return api.post('/users/register', userData);
};

// Login
export const loginUser = (email, password) => {
  return api.post('/users/login', { email, password });
};

// Logout
export const logoutUser = () => {
  return api.post('/users/logout');
};

// Forgot Password
export const forgotPassword = (email) => {
  return api.post('/users/forgot-password', { email });
};

// Reset Password
export const resetPassword = (token, password, confirmPassword) => {
  return api.put(`/users/reset-password/${token}`, {
    password,
    passwordConfirm: confirmPassword
  });
};

// ============== USER PROFILE API CALLS ==============

// Get Profile
export const getProfile = () => {
  return api.get('/users/profile');
};

// Update Profile
export const updateProfile = (profileData) => {
  return api.put('/users/profile', profileData);
};

// Change Password
export const changePassword = (currentPassword, newPassword, confirmPassword) => {
  return api.put('/users/change-password', {
    currentPassword,
    newPassword,
    passwordConfirm: confirmPassword
  });
};

// Delete Account
export const deleteAccount = () => {
  return api.delete('/users/account');
};

// ============== VEHICLE API CALLS ==============

// Add Vehicle
export const addVehicle = (vehicleData) => {
  return api.post('/users/vehicles', vehicleData);
};

// Get Vehicles
export const getVehicles = () => {
  return api.get('/users/vehicles');
};

// Update Vehicle
export const updateVehicle = (vehicleId, vehicleData) => {
  return api.put(`/users/vehicles/${vehicleId}`, vehicleData);
};

// Delete Vehicle
export const deleteVehicle = (vehicleId) => {
  return api.delete(`/users/vehicles/${vehicleId}`);
};

// ============== PAYMENT METHOD API CALLS ==============

// Add Payment Method
export const addPaymentMethod = (paymentData) => {
  return api.post('/users/payment-methods', paymentData);
};

// ============== ANALYTICS API CALLS ==============

// Get User Analytics
export const getUserAnalytics = () => {
  return api.get('/users/analytics');
};

// ============== LOYALTY API CALLS ==============

// Get Loyalty Information
export const getLoyaltyInfo = () => {
  return api.get('/users/loyalty');
};

// Add Loyalty Points
export const addLoyaltyPoints = (points) => {
  return api.post('/users/loyalty/add-points', { points });
};

// Redeem Loyalty Points
export const redeemLoyaltyPoints = (points) => {
  return api.post('/users/loyalty/redeem', { points });
};

// ============== PARKING SPOTS API CALLS ==============

// Get parking spots (with optional filters: city, available, minRate, maxRate, page, limit)
export const getSpots = (params = {}) => {
  return api.get('/parking/spots', { params });
};

// Get single parking spot
export const getSpot = (spotId) => {
  return api.get(`/parking/spots/${spotId}`);
};

// Seed sample spots (dev helper — call once)
export const seedSpots = () => {
  return api.post('/parking/spots/seed');
};

// ============== PARKING SESSION API CALLS ==============

// Start a parking session
export const startSession = (data) => {
  // data: { spotId, licensePlate, vehicleId? }
  return api.post('/parking/sessions/start', data);
};

// End a parking session
export const endSession = (sessionId) => {
  return api.put(`/parking/sessions/${sessionId}/end`);
};

// Cancel a parking session
export const cancelSession = (sessionId) => {
  return api.put(`/parking/sessions/${sessionId}/cancel`);
};

// Get the user's current active session
export const getActiveSession = () => {
  return api.get('/parking/sessions/active');
};

// Get user's session history
export const getSessionHistory = (params = {}) => {
  // params: { page, limit, status }
  return api.get('/parking/sessions/history', { params });
};

// ============== PAYMENT API CALLS ==============

// Get subscription plans
export const getPlans = () => {
  return api.get('/payments/plans');
};

// Simulate payment (demo mode)
export const simulatePayment = (data) => {
  return api.post('/payments/simulate', data);
};

// Create Stripe payment intent
export const createPaymentIntent = (plan) => {
  return api.post('/payments/create-intent', { plan });
};

// UPI — initiate (returns UPI deep-link + QR data URL)
export const initiateUpiPayment = (plan) => {
  return api.post('/payments/upi/initiate', { plan });
};

// UPI — verify payment with UTR / transaction ID
export const verifyUpiPayment = (txnRef, upiTransactionId) => {
  return api.post('/payments/upi/verify', { txnRef, upiTransactionId });
};

// QR — generate QR code for plan payment
export const generateQrPayment = (plan) => {
  return api.post('/payments/qr/generate', { plan });
};

// ============== BIOMETRIC API CALLS ==============

// Enable Biometric
export const enableBiometric = (biometricData, type) => {
  return api.post('/users/biometric/enable', {
    biometricData,
    type
  });
};

// Verify Biometric
export const verifyBiometric = (biometricData, type) => {
  return api.post('/users/biometric/verify', {
    biometricData,
    type
  });
};

// ============== UTILITY FUNCTIONS ==============

// Get error message from API response
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An error occurred';
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Get stored user
export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Clear authentication
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ============== BOOKING / ML ALLOCATION ==============
export const mlAllocateSpot  = (params) => api.get('/bookings/ml-allocate', { params })
export const createBooking   = (data)   => api.post('/bookings', data)
export const getUserBookings = (params) => api.get('/bookings', { params })
export const getBookingById  = (id)     => api.get(`/bookings/${id}`)
export const cancelBooking   = (id, reason) => api.put(`/bookings/${id}/cancel`, { reason })

// ============== SENSORS / LIVE MAP ==============
export const getFloorMap     = (params) => api.get('/sensors/floor-map', { params })
export const getSensorStats  = ()       => api.get('/sensors/stats')
export const updateSensor    = (data)   => api.post('/sensors/update', data)

// ============== INSPECTIONS / CV ==============
export const submitInspection  = (data)   => api.post('/inspections', data)
export const getUserInspections= ()       => api.get('/inspections')
export const getAllInspections  = (params) => api.get('/inspections/admin', { params })
export const reviewInspection   = (id, data) => api.put(`/inspections/${id}/review`, data)

// ============== RENTALS ==============
export const listRentals    = (params) => api.get('/rentals', { params })
export const getMyRentals   = ()       => api.get('/rentals/my')
export const createRental   = (data)   => api.post('/rentals', data)
export const getRentalById  = (id)     => api.get(`/rentals/${id}`)
export const updateRental   = (id, d)  => api.put(`/rentals/${id}`, d)
export const deleteRental   = (id)     => api.delete(`/rentals/${id}`)
export const auditRental    = (id, d)  => api.put(`/rentals/${id}/audit`, d)

// ============== RENTAL BOOKINGS ==============
export const createRentalBooking    = (data)     => api.post('/rental-bookings', data)
export const getMyRentalBookings    = (params)   => api.get('/rental-bookings', { params })
export const getRentalBookingById   = (id)       => api.get(`/rental-bookings/${id}`)
export const cancelRentalBooking    = (id, reason) => api.put(`/rental-bookings/${id}/cancel`, { cancellationReason: reason })
export const confirmRentalPayment   = (id, paymentId, method) => {
  if (!id || id === 'undefined') {
    return Promise.reject(new Error('Booking ID is missing'));
  }
  return api.put(`/rental-bookings/${id}/confirm-payment`, { paymentId, paymentMethod: method });
}
export const markRentalReturned     = (id, condition, damage, damageAmt) => api.put(`/rental-bookings/${id}/return`, { returnCondition: condition, damageReport: damage, damageAmount: damageAmt })
export const checkRentalAvailability = (rentalId, startDate, endDate) => api.get(`/rental-bookings/rental/${rentalId}/availability`, { params: { startDate, endDate } })
export const getRentalBookedDates   = (rentalId, days) => api.get(`/rental-bookings/rental/${rentalId}/booked-dates`, { params: { days } })
export const getActiveRentalBooking = (rentalId) => api.get(`/rental-bookings/rental/${rentalId}/active`)

// ============== MAINTENANCE ==============
export const getMaintenanceSummary  = ()       => api.get('/maintenance/summary')
export const getMaintenanceAlerts   = (params) => api.get('/maintenance/alerts', { params })
export const createMaintenanceAlert = (data)   => api.post('/maintenance/alerts', data)
export const updateMaintenanceAlert = (id, d)  => api.put(`/maintenance/alerts/${id}`, d)
export const runPredictiveScan      = ()       => api.get('/maintenance/predict')

// ============== ADMIN ==============
export const getAdminDashboard = ()       => api.get('/admin/dashboard')
export const getAdminAnalytics = ()       => api.get('/admin/analytics')
export const getAdminUsers     = (params) => api.get('/admin/users', { params })
export const updateAdminUser   = (id, d)  => api.put(`/admin/users/${id}`, d)
export const getAdminSpots     = (params) => api.get('/admin/spots', { params })
export const updateAdminSpot   = (id, d)  => api.put(`/admin/spots/${id}`, d)

export default api;
