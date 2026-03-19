import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // Register user
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/users/register', userData);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setToken(response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login user
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/users/login', { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setToken(response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout user
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await api.post('/users/logout');
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user profile
  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (err) {
      console.error('Get profile error:', err);
      setError(err.response?.data?.message || 'Failed to get profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      const response = await api.put('/users/profile', profileData);
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    try {
      setLoading(true);
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
        passwordConfirm: confirmPassword
      });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user analytics
  const getAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/analytics');
      return response.data.analytics;
    } catch (err) {
      console.error('Get analytics error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get loyalty information
  const getLoyalty = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/loyalty');
      return response.data.loyalty;
    } catch (err) {
      console.error('Get loyalty error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add loyalty points
  const addLoyaltyPoints = useCallback(async (points) => {
    try {
      setLoading(true);
      const response = await api.post('/users/loyalty/add-points', { points });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add loyalty points';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Redeem loyalty points
  const redeemLoyaltyPoints = useCallback(async (points) => {
    try {
      setLoading(true);
      const response = await api.post('/users/loyalty/redeem', { points });
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to redeem loyalty points';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add vehicle
  const addVehicle = useCallback(async (vehicleData) => {
    try {
      setLoading(true);
      const response = await api.post('/users/vehicles', vehicleData);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add vehicle';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get vehicles
  const getVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/vehicles');
      return response.data.vehicles;
    } catch (err) {
      console.error('Get vehicles error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update vehicle
  const updateVehicle = useCallback(async (vehicleId, vehicleData) => {
    try {
      setLoading(true);
      const response = await api.put(`/users/vehicles/${vehicleId}`, vehicleData);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update vehicle';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete vehicle
  const deleteVehicle = useCallback(async (vehicleId) => {
    try {
      setLoading(true);
      const response = await api.delete(`/users/vehicles/${vehicleId}`);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete vehicle';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add payment method
  const addPaymentMethod = useCallback(async (paymentData) => {
    try {
      setLoading(true);
      const response = await api.post('/users/payment-methods', paymentData);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add payment method';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
    
    // Payment
    addPaymentMethod,
    
    // Utils
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
