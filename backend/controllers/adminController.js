/**
 * adminController.js
 * Admin monitoring dashboard — system-wide stats, user management, slot management
 */
const User             = require('../models/User');
const ParkingSpot      = require('../models/ParkingSpot');
const ParkingSession   = require('../models/ParkingSession');
const Booking          = require('../models/Booking');
const Rental           = require('../models/Rental');
const MaintenanceAlert = require('../models/MaintenanceAlert');
const SpotSensor       = require('../models/SpotSensor');
const VehicleInspection= require('../models/VehicleInspection');
const { generateToken } = require('../utils/jwt');

// ─── POST /api/admin/setup — one-time bootstrap ──────────────────────────────
exports.setupAdmin = async (req, res) => {
  try {
    // Block if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'An admin account already exists. Please log in.' });
    }

    const { firstName, lastName, email, phone, password, setupSecret } = req.body;

    // Validate setup secret
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'admin@setup123';
    if (!setupSecret || setupSecret !== expectedSecret) {
      return res.status(403).json({ success: false, message: 'Invalid setup secret.' });
    }

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, email, phone and password are all required.' });
    }

    // If user with this email already exists, promote them
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'admin';
      await user.save();
    } else {
      user = await User.create({
        firstName, lastName, email, phone, password,
        role: 'admin', parkingBehavior: {}, loyalty: {}, biometric: {},
      });
    }

    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: 'Admin account ready. You can now access the admin panel.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('setupAdmin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalUsers, activeUsers, newUsersToday,
      totalSpots, occupiedSpots,
      totalBookings, bookingsToday, activeBookings,
      openAlerts, criticalAlerts,
      activeRentals,
      revenueToday, revenueMonth,
      totalSessions, sessionsToday,
      damageToday,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      ParkingSpot.countDocuments({ isActive: true }),
      ParkingSpot.countDocuments({ isOccupied: true }),
      Booking.countDocuments({}),
      Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'active'] } }),
      MaintenanceAlert.countDocuments({ status: 'open' }),
      MaintenanceAlert.countDocuments({ status: 'open', severity: 'critical' }),
      Rental.countDocuments({ status: 'active', approvedByAdmin: true }),
      Booking.aggregate([{ $match: { createdAt: { $gte: startOfDay }, isPaid: true } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Booking.aggregate([{ $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }, isPaid: true } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      ParkingSession.countDocuments({}),
      ParkingSession.countDocuments({ startTime: { $gte: startOfDay } }),
      VehicleInspection.countDocuments({ createdAt: { $gte: startOfDay }, damageDetected: true }),
    ]);

    // Hourly occupancy for today
    const hourlyOccupancy = [];
    for (let h = 0; h < 24; h++) {
      const from = new Date(); from.setHours(h, 0, 0, 0);
      const to   = new Date(); to.setHours(h + 1, 0, 0, 0);
      const count = await Booking.countDocuments({
        status: { $in: ['confirmed', 'active', 'completed'] },
        scheduledStart: { $lte: to },
        scheduledEnd:   { $gte: from },
      });
      hourlyOccupancy.push({ hour: h, bookings: count });
    }

    // Recent activity
    const recentBookings = await Booking.find({}).sort({ createdAt: -1 }).limit(5).populate('user', 'name').populate('spot', 'spotNumber zone');
    const recentAlerts   = await MaintenanceAlert.find({ status: 'open' }).sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, newToday: newUsersToday },
        spots: { total: totalSpots, occupied: occupiedSpots, available: totalSpots - occupiedSpots, occupancyRate: totalSpots ? +(occupiedSpots / totalSpots * 100).toFixed(1) : 0 },
        bookings: { total: totalBookings, today: bookingsToday, active: activeBookings },
        sessions: { total: totalSessions, today: sessionsToday },
        alerts: { open: openAlerts, critical: criticalAlerts },
        rentals: { active: activeRentals },
        revenue: { today: revenueToday[0]?.total || 0, month: revenueMonth[0]?.total || 0 },
        damage: { today: damageToday },
        hourlyOccupancy,
        recentBookings,
        recentAlerts,
      },
    });
  } catch (err) {
    console.error('adminDashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, limit = 30, page = 1, isActive } = req.query;
    const filter = {};
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter, '-password -biometricKey').sort({ createdAt: -1 }).skip(skip).limit(+limit),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const allowed = ['isActive', 'role'];
    const update  = {};
    for (const k of allowed) { if (req.body[k] !== undefined) update[k] = req.body[k]; }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/spots ─────────────────────────────────────────────────────
exports.getSpots = async (req, res) => {
  try {
    const { zone, isOccupied, limit = 100 } = req.query;
    const filter = {};
    if (zone) filter.zone = zone;
    if (isOccupied !== undefined) filter.isOccupied = isOccupied === 'true';
    const spots = await ParkingSpot.find(filter).limit(+limit);
    res.json({ success: true, data: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/spots/:id ─────────────────────────────────────────────────
exports.updateSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const days = 7;
    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const e = new Date(d); e.setDate(e.getDate() + 1);
      const [bookings, revenue, sessions] = await Promise.all([
        Booking.countDocuments({ createdAt: { $gte: d, $lt: e } }),
        Booking.aggregate([{ $match: { createdAt: { $gte: d, $lt: e }, isPaid: true } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
        ParkingSession.countDocuments({ startTime: { $gte: d, $lt: e } }),
      ]);
      dailyStats.push({ date: d.toISOString().slice(0, 10), bookings, revenue: revenue[0]?.total || 0, sessions });
    }
    res.json({ success: true, data: dailyStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
