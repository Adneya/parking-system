const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// @desc    Generate JWT token
// @param   {string} userId - User ID
// @param   {string} role   - User role (e.g. 'user', 'admin')
// @return  {string} JWT token
exports.generateToken = (userId, role = 'user') => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// @desc    Verify JWT token
// @param   {string} token - JWT token
// @return  {object} Decoded token
exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// @desc    Decode JWT token without verification
// @param   {string} token - JWT token
// @return  {object} Decoded token
exports.decodeToken = (token) => {
  return jwt.decode(token);
};

// @desc    Generate refresh token
// @param   {string} userId - User ID
// @return  {string} Refresh token
exports.generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Generate access and refresh tokens
// @param   {string} userId - User ID
// @return  {object} Object containing access and refresh tokens
exports.generateTokens = (userId) => {
  const accessToken = exports.generateToken(userId);
  const refreshToken = exports.generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRE
  };
};

// @desc    Verify refresh token
// @param   {string} token - Refresh token
// @return  {object} Decoded token
exports.verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// @desc    Generate reset token
// @param   {string} userId - User ID
// @return  {string} Reset token
exports.generateResetToken = (userId) => {
  return jwt.sign({ id: userId, type: 'reset' }, JWT_SECRET, {
    expiresIn: '10m'
  });
};

// @desc    Verify reset token
// @param   {string} token - Reset token
// @return  {object} Decoded token
exports.verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'reset') {
      throw new Error('Invalid reset token');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid reset token');
  }
};
