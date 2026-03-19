const User = require('../models/User');
const ParkingSession = require('../models/ParkingSession');
const { generateToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const crypto = require('crypto');
const mongoose = require('mongoose');

// @desc    User Registration
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, passwordConfirm } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or phone already exists' 
      });
    }

    // Create user
    user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      parkingBehavior: {},
      loyalty: {},
      biometric: {}
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    // Send welcome email (non-blocking — don't crash registration if email fails)
    sendWelcomeEmail(user.email, user.getFullName()).catch(err =>
      console.error('Welcome email failed:', err.message)
    );

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    User Login
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Find user and select password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(429).json({ 
        success: false, 
        message: 'Account locked. Please try again later.' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Record login
    await user.recordLogin({
      ipAddress: req.ip,
      deviceName: req.headers['user-agent'],
      browser: req.headers['user-agent']
    });

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    User Logout
// @route   POST /api/users/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      user: user.getPublicProfile()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        address,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add vehicle
// @route   POST /api/users/vehicles
// @access  Private
exports.addVehicle = async (req, res) => {
  try {
    const { licensePlate, make, model, year, color, type, vin } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    await user.addVehicle({
      licensePlate,
      make,
      model,
      year,
      color,
      type,
      vin
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      vehicles: user.vehicles
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get vehicles
// @route   GET /api/users/vehicles
// @access  Private
exports.getVehicles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      vehicles: user.vehicles
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/users/vehicles/:vehicleId
// @access  Private
exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const updateData = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const vehicle = user.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found' 
      });
    }

    Object.assign(vehicle, updateData);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/users/vehicles/:vehicleId
// @access  Private
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    await user.removeVehicle(vehicleId);

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add payment method
// @route   POST /api/users/payment-methods
// @access  Private
exports.addPaymentMethod = async (req, res) => {
  try {
    const { type, cardNumber, expiryDate, cardholderName } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    await user.addPaymentMethod({
      type,
      cardNumber,
      expiryDate,
      cardholderName,
      isDefault: user.paymentMethods.length === 0,
      isVerified: false
    });

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get user analytics
// @route   GET /api/users/analytics
// @access  Private
exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [activeSessions, totalSessions, aggResult] = await Promise.all([
      ParkingSession.countDocuments({ userId, status: 'active' }),
      ParkingSession.countDocuments({ userId }),
      ParkingSession.aggregate([
        { $match: { userId, status: 'completed' } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' },
            totalSpent: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const avgDurationHours = aggResult[0]?.avgDuration || 0;
    const avgDuration = avgDurationHours > 0
      ? `${avgDurationHours.toFixed(1)}h`
      : '0h';

    res.status(200).json({
      success: true,
      analytics: {
        activeReservations: activeSessions,
        totalParkings: totalSessions,
        avgDuration,
        totalSpent: parseFloat((aggResult[0]?.totalSpent || user.loyalty.totalSpent || 0).toFixed(2)),
        loyaltyPoints: user.loyalty.points,
        tier: user.loyalty.tier,
        totalVehicles: user.vehicles.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get loyalty points
// @route   GET /api/users/loyalty
// @access  Private
exports.getLoyalty = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      loyalty: {
        points: user.loyalty.points,
        tier: user.loyalty.tier,
        totalSpent: user.loyalty.totalSpent,
        discountPercentage: user.loyalty.discountPercentage,
        memberSince: user.loyalty.memberSince
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add loyalty points
// @route   POST /api/users/loyalty/add-points
// @access  Private
exports.addLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid points value' 
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    await user.addLoyaltyPoints(points);

    res.status(200).json({
      success: true,
      message: 'Points added successfully',
      loyalty: {
        points: user.loyalty.points,
        tier: user.loyalty.tier,
        totalSpent: user.loyalty.totalSpent
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Redeem loyalty points
// @route   POST /api/users/loyalty/redeem
// @access  Private
exports.redeemLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid points value' 
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    await user.redeemLoyaltyPoints(points);

    res.status(200).json({
      success: true,
      message: 'Points redeemed successfully',
      loyalty: {
        points: user.loyalty.points,
        rewardsRedeemed: user.loyalty.rewardsRedeemed
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Enable biometric
// @route   POST /api/users/biometric/enable
// @access  Private
exports.enableBiometric = async (req, res) => {
  try {
    const { biometricData, type } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (type === 'fingerprint') {
      user.biometric.fingerprints.push(Buffer.from(biometricData));
    } else if (type === 'face') {
      user.biometric.faceRecognition = Buffer.from(biometricData);
    }

    user.biometric.biometricEnabled = true;
    user.biometric.lastBiometricUpdate = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Biometric authentication enabled successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Verify biometric
// @route   POST /api/users/biometric/verify
// @access  Private
exports.verifyBiometric = async (req, res) => {
  try {
    const { biometricData, type } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Placeholder for biometric verification logic
    let isVerified = false;

    if (type === 'fingerprint' && user.biometric.fingerprints.length > 0) {
      isVerified = true;
    } else if (type === 'face' && user.biometric.faceRecognition) {
      isVerified = true;
    }

    if (!isVerified) {
      return res.status(401).json({ 
        success: false, 
        message: 'Biometric verification failed' 
      });
    }

    user.biometric.biometricVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Biometric verified successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, passwordConfirm, confirmPassword } = req.body;
    const newPasswordConfirm = passwordConfirm || confirmPassword;

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ 
        success: false, 
        message: 'New passwords do not match' 
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email (non-blocking)
    sendPasswordResetEmail(user.email, resetToken).catch(err =>
      console.error('Password reset email failed:', err.message)
    );

    // In development, also return token directly for testing
    const devToken = process.env.NODE_ENV === 'development' ? { resetToken } : {};

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
      ...devToken
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Reset password
// @route   PUT /api/users/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm, confirmPassword } = req.body;
    const passwordMatch = passwordConfirm || confirmPassword;

    if (password !== passwordMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
