const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    JWT verification middleware
// @access  Private
exports.authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Optional JWT verification middleware
// @access  Public (but validates if token is provided)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If token exists, verify it
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we allow the request to continue
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Role-based access control middleware
// @access  Private
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized to access this route' 
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `User role ${user.role} is not authorized to access this route` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  };
};

// @desc    Email verification middleware
// @access  Private
exports.verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email first' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Phone verification middleware
// @access  Private
exports.verifyPhone = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.isPhoneVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your phone number first' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Two-factor authentication middleware
// @access  Private
exports.verifyTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.twoFactorEnabled) {
      // Check if 2FA code is provided in request
      const twoFactorCode = req.headers['x-2fa-code'];

      if (!twoFactorCode) {
        return res.status(403).json({ 
          success: false, 
          message: 'Two-factor authentication code required' 
        });
      }

      // Verify the 2FA code (placeholder logic)
      // In a real implementation, you would use a library like speakeasy
      const isValid = true; // Replace with actual verification

      if (!isValid) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid two-factor authentication code' 
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Account active middleware
// @access  Private
exports.checkAccountActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been deactivated' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Rate limiting middleware
// @access  Public
exports.rateLimitAuth = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = {};

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    if (!attempts[key]) {
      attempts[key] = [];
    }

    // Remove old attempts outside the time window
    attempts[key] = attempts[key].filter(time => now - time < windowMs);

    if (attempts[key].length >= maxAttempts) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many attempts. Please try again later.' 
      });
    }

    attempts[key].push(now);
    next();
  };
};
