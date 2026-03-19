const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Public Routes

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', userController.registerUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', userController.loginUser);

// @route   POST /api/users/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', userController.forgotPassword);

// @route   PUT /api/users/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.put('/reset-password/:token', userController.resetPassword);

// Protected Routes (Requires Authentication)

// @route   POST /api/users/logout
// @desc    Logout user
// @access  Private
router.post(
  '/logout',
  authMiddleware.authenticate,
  userController.logoutUser
);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get(
  '/profile',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.getUserProfile
);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.updateUserProfile
);

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put(
  '/change-password',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.changePassword
);

// Vehicle Management Routes

// @route   POST /api/users/vehicles
// @desc    Add a new vehicle
// @access  Private
router.post(
  '/vehicles',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.addVehicle
);

// @route   GET /api/users/vehicles
// @desc    Get all user vehicles
// @access  Private
router.get(
  '/vehicles',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.getVehicles
);

// @route   PUT /api/users/vehicles/:vehicleId
// @desc    Update a vehicle
// @access  Private
router.put(
  '/vehicles/:vehicleId',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.updateVehicle
);

// @route   DELETE /api/users/vehicles/:vehicleId
// @desc    Delete a vehicle
// @access  Private
router.delete(
  '/vehicles/:vehicleId',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.deleteVehicle
);

// Payment Methods Routes

// @route   POST /api/users/payment-methods
// @desc    Add a payment method
// @access  Private
router.post(
  '/payment-methods',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.addPaymentMethod
);

// Analytics Routes

// @route   GET /api/users/analytics
// @desc    Get user analytics
// @access  Private
router.get(
  '/analytics',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.getUserAnalytics
);

// Loyalty Program Routes

// @route   GET /api/users/loyalty
// @desc    Get loyalty points and tier information
// @access  Private
router.get(
  '/loyalty',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.getLoyalty
);

// @route   POST /api/users/loyalty/add-points
// @desc    Add loyalty points
// @access  Private
router.post(
  '/loyalty/add-points',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.addLoyaltyPoints
);

// @route   POST /api/users/loyalty/redeem
// @desc    Redeem loyalty points
// @access  Private
router.post(
  '/loyalty/redeem',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.redeemLoyaltyPoints
);

// Biometric Routes

// @route   POST /api/users/biometric/enable
// @desc    Enable biometric authentication
// @access  Private
router.post(
  '/biometric/enable',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.enableBiometric
);

// @route   POST /api/users/biometric/verify
// @desc    Verify biometric authentication
// @access  Private
router.post(
  '/biometric/verify',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  userController.verifyBiometric
);

// Account Management Routes

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete(
  '/account',
  authMiddleware.authenticate,
  userController.deleteAccount
);

module.exports = router;
