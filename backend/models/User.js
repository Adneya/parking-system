const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Vehicle Sub-schema
const vehicleSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  make: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  color: String,
  type: {
    type: String,
    enum: ['sedan', 'suv', 'truck', 'van', 'compact', 'electric'],
    required: true
  },
  vin: {
    type: String,
    unique: true,
    sparse: true
  },
  insuranceExpiry: Date,
  registrationExpiry: Date,
  isPrimary: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Parking Behavior Sub-schema
const parkingBehaviorSchema = new mongoose.Schema({
  totalParking: {
    type: Number,
    default: 0
  },
  averageStay: {
    type: Number,
    default: 0 // in minutes
  },
  peakHours: [String],
  frequentLocations: [{
    location: String,
    frequency: Number
  }],
  cancellations: {
    type: Number,
    default: 0
  },
  violations: {
    type: Number,
    default: 0
  },
  lastParkingSession: Date,
  parkingHistory: [{
    date: Date,
    duration: Number,
    location: String,
    cost: Number
  }]
});

// Loyalty Sub-schema
const loyaltySchema = new mongoose.Schema({
  points: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  memberSince: {
    type: Date,
    default: Date.now
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  rewardsRedeemed: {
    type: Number,
    default: 0
  },
  pointsHistory: [{
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired'],
      required: true
    },
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    },
    description: String
  }]
});

// Biometric Sub-schema
const biometricSchema = new mongoose.Schema({
  fingerprints: {
    type: [Buffer],
    default: []
  },
  faceRecognition: {
    type: Buffer,
    sparse: true
  },
  biometricEnabled: {
    type: Boolean,
    default: false
  },
  biometricVerified: {
    type: Boolean,
    default: false
  },
  lastBiometricUpdate: Date
});

// Main User Schema
const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  profileImage: {
    type: String,
    default: null
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    sparse: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  nationalId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Account Settings
  role: {
    type: String,
    enum: ['user', 'admin', 'parking-operator'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Bank Account (for receiving payments from QR/UPI)
  bankAccount: {
    accountHolderName: String,
    accountNumber: {
      type: String,
      select: false
    },
    accountType: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings'
    },
    ifscCode: String,
    bankName: String,
    upiId: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    connectedAt: Date,
    lastUsedAt: Date
  },

  // Payment Methods (for paying to parking system)
  paymentMethods: [{
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'wallet', 'bank_transfer'],
      required: true
    },
    cardNumber: {
      type: String,
      select: false
    },
    expiryDate: String,
    cardholderName: String,
    isDefault: Boolean,
    isVerified: Boolean,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Nested Schemas
  vehicles: [vehicleSchema],
  parkingBehavior: parkingBehaviorSchema,
  loyalty: loyaltySchema,
  biometric: biometricSchema,
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    deviceName: String,
    browser: String
  }],
  
  // Notifications
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastPasswordChange: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date
}, { timestamps: true });

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Method: Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Method: Add vehicle
userSchema.methods.addVehicle = function(vehicleData) {
  if (this.vehicles.length > 0) {
    this.vehicles.forEach(v => v.isPrimary = false);
  }
  vehicleData.isPrimary = true;
  this.vehicles.push(vehicleData);
  return this.save();
};

// Method: Remove vehicle
userSchema.methods.removeVehicle = async function(vehicleId) {
  this.vehicles = this.vehicles.filter(v => v._id.toString() !== vehicleId);
  return this.save();
};

// Method: Get primary vehicle
userSchema.methods.getPrimaryVehicle = function() {
  return this.vehicles.find(v => v.isPrimary);
};

// Method: Update parking behavior
userSchema.methods.updateParkingBehavior = function(parkingData) {
  this.parkingBehavior.totalParking += 1;
  this.parkingBehavior.lastParkingSession = new Date();
  
  if (parkingData.history) {
    this.parkingBehavior.parkingHistory.push(parkingData.history);
  }
  
  return this.save();
};

// Method: Add loyalty points
userSchema.methods.addLoyaltyPoints = function(points) {
  this.loyalty.points += points;
  this.loyalty.totalSpent += (points * 0.1); // Assuming 1 point = 0.1 currency
  this.updateLoyaltyTier();
  return this.save();
};

// Method: Update loyalty tier
userSchema.methods.updateLoyaltyTier = function() {
  const spent = this.loyalty.totalSpent;
  
  if (spent >= 5000) this.loyalty.tier = 'platinum';
  else if (spent >= 3000) this.loyalty.tier = 'gold';
  else if (spent >= 1500) this.loyalty.tier = 'silver';
  else this.loyalty.tier = 'bronze';
  
  // Update discount
  const discounts = { bronze: 0, silver: 5, gold: 10, platinum: 15 };
  this.loyalty.discountPercentage = discounts[this.loyalty.tier];
};

// Method: Redeem loyalty points
userSchema.methods.redeemLoyaltyPoints = async function(pointsToRedeem) {
  if (this.loyalty.points < pointsToRedeem) {
    throw new Error('Insufficient loyalty points');
  }
  
  this.loyalty.points -= pointsToRedeem;
  this.loyalty.rewardsRedeemed += 1;
  
  this.loyalty.pointsHistory.push({
    type: 'redeemed',
    amount: pointsToRedeem,
    description: 'Points redeemed for parking discount'
  });
  
  return this.save();
};

// Method: Enable two-factor authentication
userSchema.methods.enableTwoFactor = function(secret) {
  this.twoFactorEnabled = true;
  this.twoFactorSecret = secret;
  return this.save();
};

// Method: Disable two-factor authentication
userSchema.methods.disableTwoFactor = function() {
  this.twoFactorEnabled = false;
  this.twoFactorSecret = null;
  return this.save();
};

// Method: Add payment method
userSchema.methods.addPaymentMethod = async function(paymentData) {
  if (paymentData.isDefault) {
    this.paymentMethods.forEach(p => p.isDefault = false);
  }
  
  this.paymentMethods.push(paymentData);
  return this.save();
};

// Method: Remove payment method
userSchema.methods.removePaymentMethod = async function(methodId) {
  this.paymentMethods = this.paymentMethods.filter(m => m._id.toString() !== methodId);
  return this.save();
};

// Method: Record login
userSchema.methods.recordLogin = function(loginData) {
  this.lastLogin = new Date();
  this.loginAttempts = 0;
  this.lockUntil = null;
  
  this.loginHistory.unshift(loginData);
  if (this.loginHistory.length > 50) {
    this.loginHistory.pop();
  }
  
  return this.save();
};

// Method: Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }
  
  return this.save();
};

// Method: Check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method: Get user analytics
userSchema.methods.getAnalytics = function() {
  return {
    totalSessions: this.parkingBehavior.totalParking,
    averageSessionDuration: this.parkingBehavior.averageStay,
    totalSpent: this.loyalty.totalSpent,
    loyaltyPoints: this.loyalty.points,
    currentTier: this.loyalty.tier,
    violations: this.parkingBehavior.violations,
    memberSince: this.loyalty.memberSince,
    totalVehicles: this.vehicles.length
  };
};

// Method: Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return resetToken;
};

// Method: Get user profile (public data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    profileImage: this.profileImage,
    joinDate: this.createdAt,
    loyaltyTier: this.loyalty.tier,
    totalParking: this.parkingBehavior.totalParking
  };
};

module.exports = mongoose.model('User', userSchema);
