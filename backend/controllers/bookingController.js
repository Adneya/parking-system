/**
 * bookingController.js
 * Pre-booking + ML slot allocation + dynamic rebalancing
 */
const Booking       = require('../models/Booking');
const ParkingSpot   = require('../models/ParkingSpot');
const SpotSensor    = require('../models/SpotSensor');
const MaintenanceAlert = require('../models/MaintenanceAlert');
const QRCode        = require('qrcode');
const { scoreCityPreference } = require('../utils/cityPreferenceModel');

// ─── Simple ML scoring ────────────────────────────────────────────────────────
// Score each available parking lot based on multiple factors
function mlScoreSpot(spot, sensor, vehicleType, durationHours, preferenceContext = {}) {
  let operationalScore = 100;

  // Higher rating is better
  operationalScore += (spot.rating || 0) * 5;

  // Prefer lots with more available capacity (lower occupancy ratio)
  const occupancyRatio = spot.totalSpots > 0
    ? (spot.totalSpots - (spot.availableSpots || 0)) / spot.totalSpots
    : 1;
  operationalScore += (1 - occupancyRatio) * 20;

  // EV charger bonus
  if (vehicleType === 'ev' && spot.amenities?.includes('ev_charging')) operationalScore += 30;

  // Covered bonus for long stays
  if (durationHours > 4 && spot.amenities?.includes('covered')) operationalScore += 15;

  // Sensor-based occupancy pattern bonus
  if (sensor) {
    operationalScore += (1 - (sensor.avgDailyOccupancy || 0)) * 20;
    if (sensor.sensorFaulty) operationalScore -= 50;
  }

  // Penalise expensive lots slightly for budget sensitivity
  operationalScore -= (spot.hourlyRate || 0) * 0.5;

  const preferenceSignals = scoreCityPreference(spot, {
    ...preferenceContext,
    vehicleType,
    durationHours,
  });
  const hasPreferenceInput = Boolean(
    preferenceContext.preferredCity ||
    preferenceContext.preferredLocality ||
    Number.isFinite(preferenceContext.preferredLatitude) ||
    Number.isFinite(preferenceContext.preferredLongitude)
  );
  const baseScore = Math.max(0, Math.round(operationalScore));
  const combinedScore = hasPreferenceInput
    ? Math.round(baseScore * 0.58 + preferenceSignals.preferenceScore * 0.42)
    : baseScore;

  return {
    score: Math.max(0, combinedScore),
    operationalScore: baseScore,
    preferenceScore: preferenceSignals.preferenceScore,
    localityMatch: preferenceSignals.localityMatch,
    distanceKm: preferenceSignals.distanceKm,
  };
}

// ─── Rebalancing: move bookings if a spot becomes unavailable ────────────────
async function rebalanceBookings(unavailableSpotId, reason) {
  const now = new Date();
  const affected = await Booking.find({
    spot: unavailableSpotId,
    status: { $in: ['pending', 'confirmed'] },
    scheduledStart: { $gt: now },
  });

  for (const booking of affected) {
    // find next best lot in same city
    const faultySpot = await ParkingSpot.findById(unavailableSpotId);
    const candidates = await ParkingSpot.find({
      _id: { $ne: unavailableSpotId },
      city: faultySpot?.city,
      status: 'active',
      availableSpots: { $gt: 0 },
    }).limit(10);

    const conflicts = await Booking.find({
      spot: { $in: candidates.map(c => c._id) },
      status: { $in: ['pending', 'confirmed', 'active'] },
      scheduledStart: { $lt: booking.scheduledEnd },
      scheduledEnd:   { $gt: booking.scheduledStart },
    }).select('spot');

    const conflictIds = new Set(conflicts.map(c => c.spot.toString()));
    const free = candidates.filter(c => !conflictIds.has(c._id.toString()));

    if (free.length > 0) {
      booking.spot        = free[0]._id;
      booking.mlRebalanced = true;
      booking.rebalanceReason = reason;
      await booking.save();
    } else {
      // No replacement – cancel
      booking.status       = 'cancelled';
      booking.cancelReason = `Spot unavailable: ${reason}`;
      booking.cancelledAt  = now;
      await booking.save();
    }
  }
  return affected.length;
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { spotId, vehicleType = 'car', licensePlate, scheduledStart, scheduledEnd, make, model } = req.body;
    if (!spotId || !licensePlate || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ success: false, message: 'spotId, licensePlate, scheduledStart and scheduledEnd are required' });
    }

    const start = new Date(scheduledStart);
    const end   = new Date(scheduledEnd);
    if (end <= start) return res.status(400).json({ success: false, message: 'scheduledEnd must be after scheduledStart' });
    if (start < new Date()) return res.status(400).json({ success: false, message: 'Booking must be in the future' });

    const spot = await ParkingSpot.findById(spotId);
    if (!spot || spot.status !== 'active') return res.status(404).json({ success: false, message: 'Spot not found or inactive' });
    if (spot.availableSpots <= 0) return res.status(409).json({ success: false, message: 'No available spots in this parking lot' });

    // Check for conflicts
    const conflict = await Booking.findOne({
      spot: spotId,
      status: { $in: ['pending', 'confirmed', 'active'] },
      scheduledStart: { $lt: end },
      scheduledEnd:   { $gt: start },
    });
    if (conflict) return res.status(409).json({ success: false, message: 'Spot already booked for this time slot' });

    // ML score
    const sensor = await SpotSensor.findOne({ spot: spotId });
    const duration = (end - start) / 3600000;
    const mlScoreResult = mlScoreSpot(spot, sensor, vehicleType, duration);

    // Calculate amount
    const hours = Math.ceil(duration);
    const baseRate   = spot.hourlyRate || 30;
    const totalAmount = hours * baseRate;

    // Generate check-in QR
    const qrPayload = JSON.stringify({ bookingUser: req.user.id, spot: spot.name, start: start.toISOString() });
    const qrCode = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', width: 200 });

    const booking = await Booking.create({
      user: req.user.id,
      spot: spotId,
      vehicle: { licensePlate, type: vehicleType, make, model },
      scheduledStart: start,
      scheduledEnd: end,
      status: 'confirmed',
      mlScore: mlScoreResult.score,
      baseRate,
      totalAmount,
      qrCode,
      confirmedAt: new Date(),
    });

    await booking.populate('spot', 'name address city hourlyRate amenities availableSpots totalSpots status rating');
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error('createBooking error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bookings/ml-allocate ───────────────────────────────────────────
// ML-based best-spot recommendation for a given time + vehicle type
exports.mlAllocate = async (req, res) => {
  try {
    const {
      vehicleType = 'car',
      scheduledStart,
      scheduledEnd,
      preferCovered,
      preferEV,
      zone,
      preferredCity,
      preferredLocality,
      preferredLatitude,
      preferredLongitude,
    } = req.query;
    if (!scheduledStart || !scheduledEnd) {
      return res.status(400).json({ success: false, message: 'scheduledStart and scheduledEnd required' });
    }

    const start = new Date(scheduledStart);
    const end   = new Date(scheduledEnd);
    const requestedCity = preferredCity || zone;
    const requestContext = {
      preferredCity: requestedCity,
      preferredLocality,
      preferCovered: preferCovered === 'true',
      preferEV: preferEV === 'true',
      preferredLatitude: preferredLatitude ? Number(preferredLatitude) : null,
      preferredLongitude: preferredLongitude ? Number(preferredLongitude) : null,
    };

    // Build filter using actual ParkingSpot schema fields
    const filter = { status: 'active', availableSpots: { $gt: 0 } };
    if (requestedCity) filter.city = { $regex: `^${String(requestedCity).trim()}$`, $options: 'i' };
    if (preferEV === 'true') filter.amenities = { $in: ['ev_charging'] };
    if (preferCovered === 'true') {
      // Merge with existing amenities filter if any
      if (filter.amenities) {
        filter.amenities.$in.push('covered');
      } else {
        filter.amenities = { $in: ['covered'] };
      }
    }

    let spots = await ParkingSpot.find(filter).limit(50);

    // Remove spots with conflicting bookings
    const conflicts = await Booking.find({
      spot: { $in: spots.map(s => s._id) },
      status: { $in: ['pending', 'confirmed', 'active'] },
      scheduledStart: { $lt: end },
      scheduledEnd:   { $gt: start },
    }).select('spot');
    const conflictIds = new Set(conflicts.map(c => c.spot.toString()));
    spots = spots.filter(s => !conflictIds.has(s._id.toString()));

    if (spots.length === 0) return res.status(200).json({ success: true, data: [], message: 'No available spots for this time slot' });

    // Load sensors and score
    const sensors = await SpotSensor.find({ spot: { $in: spots.map(s => s._id) } });
    const sensorMap = {};
    for (const sn of sensors) sensorMap[sn.spot.toString()] = sn;

    const duration = (end - start) / 3600000;
    const scored = spots.map(s => ({
      spot: s,
      ...mlScoreSpot(s, sensorMap[s._id.toString()], vehicleType, duration, requestContext),
    })).sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: scored.slice(0, 5).map((s) => ({
        ...s.spot.toObject(),
        mlScore: s.score,
        operationalScore: s.operationalScore,
        preferenceScore: s.preferenceScore,
        localityMatch: s.localityMatch,
        distanceKm: s.distanceKm,
      })),
    });
  } catch (err) {
    console.error('mlAllocate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bookings ────────────────────────────────────────────────────────
exports.getUserBookings = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).populate('spot', 'name city hourlyRate amenities availableSpots totalSpots status rating'),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, data: bookings, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).populate('spot');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/bookings/:id/cancel ─────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a booking that is active/completed' });
    }
    booking.status      = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = req.body.reason || 'User cancelled';
    await booking.save();
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/bookings/rebalance (admin) ─────────────────────────────────────
exports.triggerRebalance = async (req, res) => {
  try {
    const { spotId, reason } = req.body;
    if (!spotId) return res.status(400).json({ success: false, message: 'spotId required' });
    const count = await rebalanceBookings(spotId, reason || 'Manual rebalance');
    res.json({ success: true, message: `Rebalanced ${count} bookings` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bookings/admin/all (admin) ──────────────────────────────────────
exports.getAllBookings = async (req, res) => {
  try {
    const { status, from, to, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.scheduledStart = {};
      if (from) filter.scheduledStart.$gte = new Date(from);
      if (to)   filter.scheduledStart.$lte = new Date(to);
    }
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit)
        .populate('user', 'name email')
        .populate('spot', 'spotNumber zone floor'),
      Booking.countDocuments(filter),
    ]);
    res.json({ success: true, data: bookings, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
