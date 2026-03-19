const mongoose = require('mongoose');
const ParkingSpot = require('../models/ParkingSpot');
const ParkingSession = require('../models/ParkingSession');
const User = require('../models/User');

// ─── SPOTS ───────────────────────────────────────────────────────────────────

// @desc    Get all parking spots (with optional filters)
// @route   GET /api/parking/spots
// @access  Public
exports.getSpots = async (req, res) => {
  try {
    const {
      city,
      available,
      minRate,
      maxRate,
      amenities,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { status: 'active' };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (available === 'true') query.availableSpots = { $gt: 0 };
    if (minRate || maxRate) {
      query.hourlyRate = {};
      if (minRate) query.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) query.hourlyRate.$lte = parseFloat(maxRate);
    }
    if (amenities) {
      const list = amenities.split(',').map((a) => a.trim());
      query.amenities = { $all: list };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [spots, total] = await Promise.all([
      ParkingSpot.find(query).skip(skip).limit(parseInt(limit)).lean(),
      ParkingSpot.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      spots,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single parking spot
// @route   GET /api/parking/spots/:id
// @access  Public
exports.getSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findById(req.params.id).lean();
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    res.json({ success: true, spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a parking spot (admin)
// @route   POST /api/parking/spots
// @access  Private / Admin
exports.createSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Parking spot created', spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update a parking spot (admin)
// @route   PUT /api/parking/spots/:id
// @access  Private / Admin
exports.updateSpot = async (req, res) => {
  try {
    const spot = await ParkingSpot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
    res.json({ success: true, message: 'Spot updated', spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Seed sample parking spots (dev/setup only)
// @route   POST /api/parking/spots/seed
// @access  Private
exports.seedSpots = async (req, res) => {
  try {
    const count = await ParkingSpot.countDocuments();
    const append = String(req.query.append || req.body?.append || 'false') === 'true';
    const rawPerCity = parseInt(req.query.perCity || req.body?.perCity || '80', 10);
    const perCity = Number.isFinite(rawPerCity) ? Math.min(250, Math.max(5, rawPerCity)) : 80;

    if (count > 0 && !append) {
      return res.json({
        success: true,
        message: `${count} spots already exist. Use /api/parking/spots/seed?append=true&perCity=80 to add more data.`,
      });
    }

    const cityConfigs = [
      { city: 'Mumbai', center: [72.8777, 19.076], baseRate: 3.2, localities: ['BKC', 'Andheri', 'Powai', 'Dadar', 'Fort'] },
      { city: 'Delhi', center: [77.2090, 28.6139], baseRate: 3.0, localities: ['Connaught Place', 'Saket', 'Dwarka', 'Karol Bagh', 'Rohini'] },
      { city: 'Bengaluru', center: [77.5946, 12.9716], baseRate: 2.9, localities: ['Whitefield', 'Koramangala', 'Indiranagar', 'Hebbal', 'Electronic City'] },
      { city: 'Hyderabad', center: [78.4867, 17.3850], baseRate: 2.7, localities: ['Hitech City', 'Gachibowli', 'Secunderabad', 'Banjara Hills', 'Kukatpally'] },
      { city: 'Chennai', center: [80.2707, 13.0827], baseRate: 2.6, localities: ['T Nagar', 'OMR', 'Velachery', 'Anna Nagar', 'Guindy'] },
      { city: 'Pune', center: [73.8567, 18.5204], baseRate: 2.5, localities: ['Hinjewadi', 'Kothrud', 'Viman Nagar', 'Baner', 'Shivajinagar'] },
      { city: 'Gurgaon', center: [77.0266, 28.4595], baseRate: 2.8, localities: ['Cyber City', 'Sohna Road', 'Sector 29', 'Golf Course Road', 'Udyog Vihar'] },
      { city: 'Kolkata', center: [88.3639, 22.5726], baseRate: 2.4, localities: ['Salt Lake', 'Park Street', 'Howrah', 'New Town', 'Garia'] },
      { city: 'Ahmedabad', center: [72.5714, 23.0225], baseRate: 2.3, localities: ['Satellite', 'Navrangpura', 'CG Road', 'Thaltej', 'Bopal'] },
      { city: 'Jaipur', center: [75.7873, 26.9124], baseRate: 2.1, localities: ['Malviya Nagar', 'Mansarovar', 'MI Road', 'Vaishali Nagar', 'Civil Lines'] },
      { city: 'Lucknow', center: [80.9462, 26.8467], baseRate: 2.0, localities: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad'] },
    ];

    const requestedCitiesRaw = String(req.query.cities || req.body?.cities || '').trim();
    const requestedCities = requestedCitiesRaw
      ? requestedCitiesRaw.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
      : null;
    const selectedCityConfigs = requestedCities
      ? cityConfigs.filter((cfg) => requestedCities.includes(cfg.city.toLowerCase()))
      : cityConfigs;

    if (requestedCities && selectedCityConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No matching cities found. Use comma-separated city names in cities query/body.',
      });
    }

    const amenityPool = ['covered', 'security', 'cctv', 'ev_charging', 'handicap'];
    const cityCounts = await ParkingSpot.aggregate([
      { $match: { city: { $in: selectedCityConfigs.map((c) => c.city) } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
    ]);
    const cityCountMap = cityCounts.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});

    const generatedSpots = [];
    for (const cfg of selectedCityConfigs) {
      const existingForCity = cityCountMap[cfg.city] || 0;
      for (let i = 0; i < perCity; i += 1) {
        const serial = existingForCity + i + 1;
        const locality = cfg.localities[i % cfg.localities.length];
        const totalSpots = 70 + Math.floor(Math.random() * 330); // 70..399
        const availableRatio = 0.2 + Math.random() * 0.7;
        const availableSpots = Math.max(1, Math.floor(totalSpots * availableRatio));
        const hourlyRate = Number((cfg.baseRate + (Math.random() * 2.2 - 0.4)).toFixed(1));
        const dailyRate = Number((hourlyRate * (8 + Math.random() * 4)).toFixed(1));
        const amenities = amenityPool.filter(() => Math.random() > 0.35);
        if (!amenities.length) amenities.push('security');

        const lonJitter = (Math.random() - 0.5) * 0.22;
        const latJitter = (Math.random() - 0.5) * 0.22;

        generatedSpots.push({
          name: `${locality} Parking Hub ${serial}`,
          address: `${100 + (serial % 900)} ${locality} Main Road`,
          city: cfg.city,
          totalSpots,
          availableSpots,
          hourlyRate,
          dailyRate,
          amenities,
          operatingHours: {
            is24Hours: Math.random() > 0.35,
            open: '06:00',
            close: '23:30',
          },
          rating: Number((3.2 + Math.random() * 1.8).toFixed(1)),
          totalRatings: 25 + Math.floor(Math.random() * 1800),
          location: {
            type: 'Point',
            coordinates: [
              Number((cfg.center[0] + lonJitter).toFixed(6)),
              Number((cfg.center[1] + latJitter).toFixed(6)),
            ],
          },
        });
      }
    }

    const inserted = await ParkingSpot.insertMany(generatedSpots, { ordered: false });
    const totalAfterInsert = await ParkingSpot.countDocuments();

    res.status(201).json({
      success: true,
      message: `${inserted.length} parking spots generated across ${selectedCityConfigs.length} cities (${perCity} per city).`,
      created: inserted.length,
      perCity,
      cityCount: selectedCityConfigs.length,
      selectedCities: selectedCityConfigs.map((c) => c.city),
      totalSpotsInDb: totalAfterInsert,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SESSIONS ────────────────────────────────────────────────────────────────

// @desc    Start a parking session
// @route   POST /api/parking/sessions/start
// @access  Private
exports.startSession = async (req, res) => {
  try {
    const { spotId, licensePlate, vehicleId } = req.body;

    if (!spotId || !licensePlate) {
      return res.status(400).json({ success: false, message: 'spotId and licensePlate are required' });
    }

    // Check no active session already exists for this user + plate
    const existing = await ParkingSession.findOne({
      userId: req.user.id,
      status: 'active',
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active parking session',
        session: existing,
      });
    }

    // Verify spot exists and has capacity
    const spot = await ParkingSpot.findById(spotId);
    if (!spot) return res.status(404).json({ success: false, message: 'Parking spot not found' });
    if (spot.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Parking spot is not available' });
    }
    if (spot.availableSpots <= 0) {
      return res.status(400).json({ success: false, message: 'No available spots' });
    }

    // Create session
    const session = await ParkingSession.create({
      userId: req.user.id,
      spotId,
      vehicleId,
      licensePlate: licensePlate.toUpperCase(),
      hourlyRate: spot.hourlyRate,
      startTime: new Date(),
    });

    // Decrement available spots
    spot.availableSpots = Math.max(spot.availableSpots - 1, 0);
    await spot.save();

    // Update user parkingBehavior
    await User.findByIdAndUpdate(req.user.id, {
      'parkingBehavior.lastParkingSession': new Date(),
    });

    const populated = await session.populate('spotId', 'name address city hourlyRate');
    res.status(201).json({ success: true, message: 'Parking session started', session: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    End a parking session
// @route   PUT /api/parking/sessions/:sessionId/end
// @access  Private
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ParkingSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Session is already ended' });
    }

    // Close the session
    session.endTime = new Date();
    session.status = 'completed';
    session.paymentStatus = 'paid';
    await session.save(); // pre-save calculates duration + amount

    // Restore spot availability
    await ParkingSpot.findByIdAndUpdate(session.spotId, {
      $inc: { availableSpots: 1 },
    });

    // Update user parkingBehavior and loyalty
    const user = await User.findById(req.user.id);
    if (user) {
      user.parkingBehavior.totalParking = (user.parkingBehavior.totalParking || 0) + 1;
      user.parkingBehavior.averageStay = parseFloat(
        ((user.parkingBehavior.averageStay || 0) * ((user.parkingBehavior.totalParking - 1) / user.parkingBehavior.totalParking) +
          session.duration / user.parkingBehavior.totalParking).toFixed(2)
      );
      user.loyalty.totalSpent = parseFloat(((user.loyalty.totalSpent || 0) + session.amount).toFixed(2));
      // Earn 1 point per $0.10 spent
      const pointsEarned = Math.floor(session.amount * 10);
      await user.addLoyaltyPoints(pointsEarned);
    }

    const populated = await session.populate('spotId', 'name address city');
    res.json({
      success: true,
      message: 'Parking session ended',
      session: populated,
      cost: session.amount,
      duration: session.duration,
      pointsEarned: Math.floor(session.amount * 10),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Cancel a parking session
// @route   PUT /api/parking/sessions/:sessionId/cancel
// @access  Private
exports.cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ParkingSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Session is not active' });
    }

    session.status = 'cancelled';
    session.endTime = new Date();
    await session.save();

    await ParkingSpot.findByIdAndUpdate(session.spotId, { $inc: { availableSpots: 1 } });

    res.json({ success: true, message: 'Session cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get active session for user
// @route   GET /api/parking/sessions/active
// @access  Private
exports.getActiveSession = async (req, res) => {
  try {
    const session = await ParkingSession.findOne({
      userId: req.user.id,
      status: 'active',
    }).populate('spotId', 'name address city hourlyRate');

    res.json({ success: true, session: session || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get user session history
// @route   GET /api/parking/sessions/history
// @access  Private
exports.getSessionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { userId: req.user.id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sessions, total] = await Promise.all([
      ParkingSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('spotId', 'name address city'),
      ParkingSession.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      sessions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
