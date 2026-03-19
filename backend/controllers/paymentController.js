const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const crypto = require('crypto');
const QRCode = require('qrcode');
const User = require('../models/User');

// Supported plan amounts (in cents for Stripe)
const PLANS = {
  basic:      { amount: 999,  label: 'Basic',      duration: 30 },
  premium:    { amount: 2999, label: 'Premium',     duration: 30 },
  enterprise: { amount: 9999, label: 'Enterprise',  duration: 30 },
};

// Simulated OTP verification storage (in production: use SMS/Email service)
const bankVerificationOtps = {};

// @desc    Connect bank account (submit details)
// @route   POST /api/payments/bank/connect
// @access  Private
exports.connectBankAccount = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, accountType, ifscCode, bankName, upiId } = req.body;

    // Validation
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required bank details'
      });
    }

    // Validate IFSC code format (Indian)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format. Example: HDFC0001234'
      });
    }

    // Validate account number (10-18 digits)
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account number. Must be 9-18 digits'
      });
    }

    // Validate UPI ID if provided
    if (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(upiId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. Example: name@upi'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Generate verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store OTP temporarily (30 minutes validity)
    bankVerificationOtps[req.user.id] = {
      otp,
      accountHolderName,
      accountNumber,
      accountType: accountType || 'savings',
      ifscCode,
      bankName,
      upiId,
      expiresAt: Date.now() + 30 * 60 * 1000,
      verificationToken
    };

    res.status(200).json({
      success: true,
      message: 'Bank details submitted. Please verify with OTP sent to your registered phone/email.',
      verificationToken,
      // In production: send OTP via SMS/Email
      // For demo: return OTP
      demo_otp: otp
    });
  } catch (error) {
    console.error('Bank connect error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to connect bank account'
    });
  }
};

// @desc    Verify bank account with OTP
// @route   POST /api/payments/bank/verify
// @access  Private
exports.verifyBankAccount = async (req, res) => {
  try {
    const { otp, verificationToken } = req.body;

    if (!otp || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'OTP and verification token are required'
      });
    }

    const pendingVerification = bankVerificationOtps[req.user.id];

    if (!pendingVerification || pendingVerification.verificationToken !== verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (pendingVerification.expiresAt < Date.now()) {
      delete bankVerificationOtps[req.user.id];
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please reconnect your bank account.'
      });
    }

    if (pendingVerification.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const user = await User.findById(req.user.id);

    // Save bank account details
    user.bankAccount = {
      accountHolderName: pendingVerification.accountHolderName,
      accountNumber: pendingVerification.accountNumber,
      accountType: pendingVerification.accountType,
      ifscCode: pendingVerification.ifscCode,
      bankName: pendingVerification.bankName,
      upiId: pendingVerification.upiId,
      isVerified: true,
      connectedAt: new Date()
    };

    await user.save();
    delete bankVerificationOtps[req.user.id];

    res.status(200).json({
      success: true,
      message: 'Bank account verified and connected successfully!',
      bankAccount: {
        accountHolderName: user.bankAccount.accountHolderName,
        accountNumber: `****${user.bankAccount.accountNumber.slice(-4)}`,
        bankName: user.bankAccount.bankName,
        ifscCode: user.bankAccount.ifscCode,
        upiId: user.bankAccount.upiId,
        isVerified: user.bankAccount.isVerified,
        connectedAt: user.bankAccount.connectedAt
      }
    });
  } catch (error) {
    console.error('Bank verify error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
};

// @desc    Get bank account details
// @route   GET /api/payments/bank/details
// @access  Private
exports.getBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.bankAccount || !user.bankAccount.isVerified) {
      return res.status(404).json({
        success: false,
        message: 'No verified bank account connected'
      });
    }

    res.status(200).json({
      success: true,
      bankAccount: {
        accountHolderName: user.bankAccount.accountHolderName,
        accountNumber: `****${user.bankAccount.accountNumber.slice(-4)}`,
        accountType: user.bankAccount.accountType,
        bankName: user.bankAccount.bankName,
        ifscCode: user.bankAccount.ifscCode,
        upiId: user.bankAccount.upiId,
        isVerified: user.bankAccount.isVerified,
        connectedAt: user.bankAccount.connectedAt,
        lastUsedAt: user.bankAccount.lastUsedAt
      }
    });
  } catch (error) {
    console.error('Get bank account error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bank account'
    });
  }
};

// @desc    Disconnect bank account
// @route   DELETE /api/payments/bank/disconnect
// @access  Private
exports.disconnectBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'No bank account connected'
      });
    }

    user.bankAccount = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Bank account disconnected successfully'
    });
  } catch (error) {
    console.error('Bank disconnect error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect bank account'
    });
  }
};

// @desc    Create Stripe payment intent for subscription
// @route   POST /api/payments/create-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected. Choose: basic, premium, or enterprise.'
      });
    }

    const selected = PLANS[plan];

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selected.amount,
      currency: 'usd',
      metadata: {
        userId: req.user.id,
        userEmail: req.user.email,
        plan,
      },
      description: `ParkingPro ${selected.label} Subscription`,
      receipt_email: req.user.email,
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: selected.amount,
      plan: selected.label,
    });
  } catch (error) {
    console.error('Stripe createPaymentIntent error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Payment processing error. Please try again.'
    });
  }
};

// @desc    Simulate a successful payment (used in demo mode without real Stripe keys)
// @route   POST /api/payments/simulate
// @access  Private
exports.simulatePayment = async (req, res) => {
  try {
    const { plan, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    // Basic card validation
    if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
      return res.status(400).json({ success: false, message: 'All card fields are required.' });
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleanCard)) {
      return res.status(400).json({ success: false, message: 'Invalid card number.' });
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ success: false, message: 'Invalid CVV.' });
    }

    const now = new Date();
    const expiry = new Date(Number(expiryYear), Number(expiryMonth) - 1);
    if (expiry < now) {
      return res.status(400).json({ success: false, message: 'Card is expired.' });
    }

    // Generate a secure transaction ID
    const transactionId = 'TXN_' + crypto.randomBytes(12).toString('hex').toUpperCase();
    const selected = PLANS[plan];

    // In production: update user subscription in DB here
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user) {
      user.loyalty = user.loyalty || {};
      user.loyalty.subscriptionType = plan;
      user.loyalty.subscriptionStartDate = new Date();
      user.loyalty.subscriptionEndDate = new Date(Date.now() + selected.duration * 24 * 60 * 60 * 1000);
      user.loyalty.points = (user.loyalty.points || 0) + Math.floor(selected.amount / 10);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Payment successful! ${selected.label} plan activated.`,
      transaction: {
        id: transactionId,
        plan: selected.label,
        amount: selected.amount,
        currency: 'USD',
        status: 'succeeded',
        timestamp: new Date().toISOString(),
        last4: cleanCard.slice(-4),
      }
    });
  } catch (error) {
    console.error('Payment simulation error:', error.message);
    res.status(500).json({ success: false, message: 'Payment failed. Please try again.' });
  }
};

// @desc    Get available subscription plans
// @route   GET /api/payments/plans
// @access  Public
exports.getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    plans: [
      {
        id: 'basic',
        name: 'Basic',
        price: 9.99,
        currency: 'USD',
        duration: '30 days',
        features: ['Up to 2 vehicles', 'Standard support', '5% loyalty bonus', 'Basic analytics'],
        color: 'from-blue-500 to-cyan-500',
        icon: '🚗',
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 29.99,
        currency: 'USD',
        duration: '30 days',
        popular: true,
        features: ['Up to 5 vehicles', 'Priority support', '15% loyalty bonus', 'Advanced analytics', 'Reserved spots', 'No peak surcharge'],
        color: 'from-violet-500 to-purple-600',
        icon: '⭐',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99.99,
        currency: 'USD',
        duration: '30 days',
        features: ['Unlimited vehicles', 'Dedicated support', '30% loyalty bonus', 'Full analytics suite', 'Priority reserved spots', 'Custom billing', 'Fleet management'],
        color: 'from-amber-500 to-orange-600',
        icon: '🏆',
      },
    ]
  });
};

// UPI merchant VPA (in production, load from process.env.UPI_VPA)
const UPI_VPA = process.env.UPI_VPA || '7410536905@ybl';
const UPI_NAME = process.env.UPI_NAME || 'ParkingPro Pvt Ltd';

// @desc    Initiate a UPI payment — returns a UPI deep-link + QR code data URL
// @route   POST /api/payments/upi/initiate
// @access  Private
exports.initiateUpiPayment = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    const selected = PLANS[plan];
    const amountRupees = (selected.amount / 100 * 83).toFixed(2); // demo USD→INR conversion
    const txnRef = 'UPI_' + crypto.randomBytes(10).toString('hex').toUpperCase();

    // Standard UPI deep-link format
    const upiString =
      `upi://pay?pa=${encodeURIComponent(UPI_VPA)}` +
      `&pn=${encodeURIComponent(UPI_NAME)}` +
      `&am=${amountRupees}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent('ParkingPro ' + selected.label + ' Plan')}` +
      `&tr=${txnRef}`;

    const qrDataUrl = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
      width: 300,
    });

    // Store pending transaction reference in-memory keyed by txnRef
    // (In production use Redis / DB)
    pendingUpiTxns[txnRef] = {
      userId: req.user.id,
      plan,
      amount: selected.amount,
      amountRupees,
      createdAt: Date.now(),
    };

    res.status(200).json({
      success: true,
      txnRef,
      upiString,
      qrDataUrl,
      amountRupees,
      vpa: UPI_VPA,
      merchantName: UPI_NAME,
      planLabel: selected.label,
    });
  } catch (error) {
    console.error('UPI initiate error:', error.message);
    res.status(500).json({ success: false, message: 'Could not generate UPI payment.' });
  }
};

// In-memory store for pending UPI transactions (demo only; use DB in production)
const pendingUpiTxns = {};

// @desc    Verify (simulate) a UPI payment after user claims they paid
// @route   POST /api/payments/upi/verify
// @access  Private
exports.verifyUpiPayment = async (req, res) => {
  try {
    const { txnRef, upiTransactionId } = req.body;

    if (!txnRef || !pendingUpiTxns[txnRef]) {
      return res.status(400).json({ success: false, message: 'Transaction reference not found or expired.' });
    }

    const pending = pendingUpiTxns[txnRef];

    // In production you'd call your payment gateway's API to verify the UTR/txnId.
    // Here we simulate: any non-empty upiTransactionId is accepted.
    if (!upiTransactionId || upiTransactionId.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Enter the 12-digit UPI Transaction ID (UTR).' });
    }

    const selected = PLANS[pending.plan];
    const User = require('../models/User');
    const user = await User.findById(pending.userId);
    if (user) {
      user.loyalty = user.loyalty || {};
      user.loyalty.subscriptionType = pending.plan;
      user.loyalty.subscriptionStartDate = new Date();
      user.loyalty.subscriptionEndDate = new Date(Date.now() + selected.duration * 24 * 60 * 60 * 1000);
      user.loyalty.points = (user.loyalty.points || 0) + Math.floor(selected.amount / 10);
      await user.save();
    }

    delete pendingUpiTxns[txnRef];

    res.status(200).json({
      success: true,
      message: `UPI payment verified! ${selected.label} plan activated.`,
      transaction: {
        id: txnRef,
        upiTransactionId: upiTransactionId.trim().toUpperCase(),
        plan: selected.label,
        amount: selected.amount,
        amountRupees: pending.amountRupees,
        currency: 'INR',
        status: 'succeeded',
        method: 'upi',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('UPI verify error:', error.message);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

// @desc    Generate a standalone QR code for any amount / purpose
// @route   POST /api/payments/qr/generate
// @access  Private
exports.generateQrPayment = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    const selected = PLANS[plan];
    const amountRupees = (selected.amount / 100 * 83).toFixed(2);
    const txnRef = 'QR_' + crypto.randomBytes(10).toString('hex').toUpperCase();

    const upiString =
      `upi://pay?pa=${encodeURIComponent(UPI_VPA)}` +
      `&pn=${encodeURIComponent(UPI_NAME)}` +
      `&am=${amountRupees}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent('ParkingPro ' + selected.label + ' Plan')}` +
      `&tr=${txnRef}`;

    const qrDataUrl = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
      width: 320,
    });

    pendingUpiTxns[txnRef] = {
      userId: req.user.id,
      plan,
      amount: selected.amount,
      amountRupees,
      createdAt: Date.now(),
    };

    res.status(200).json({
      success: true,
      txnRef,
      qrDataUrl,
      amountRupees,
      vpa: UPI_VPA,
      merchantName: UPI_NAME,
      planLabel: selected.label,
      upiString,
    });
  } catch (error) {
    console.error('QR generate error:', error.message);
    res.status(500).json({ success: false, message: 'Could not generate QR code.' });
  }
};

