/**
 * rentalController.js
 * Rental vehicle hosting + admin auditing
 */
const Rental = require('../models/Rental');
const ParkingSpot = require('../models/ParkingSpot');

// ─── POST /api/rentals ────────────────────────────────────────────────────────
exports.createRental = async (req, res) => {
  try {
    const { spotId, title, description, dailyRate, weeklyRate, monthlyRate, depositAmount, vehicle, availableFrom, availableTo } = req.body;
    if (!spotId || !title || !dailyRate) {
      return res.status(400).json({ success: false, message: 'spotId, title and dailyRate are required' });
    }
    const spot = await ParkingSpot.findById(spotId);
    if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });

    const rental = await Rental.create({
      host: req.user.id, spot: spotId, title, description,
      dailyRate, weeklyRate, monthlyRate, depositAmount,
      vehicle, availableFrom, availableTo, status: 'draft',
      auditLog: [{ action: 'created', by: req.user.id, note: 'Rental listing created' }],
    });
    res.status(201).json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals ─────────────────────────────────────────────────────────
exports.listRentals = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    // For development: show all rentals (draft, active, etc) regardless of approval status
    // In production, you'd require: approvedByAdmin: true AND status: 'active'
    const filter = {};
    
    if (status) {
      filter.status = status;
    } else {
      // Default: show active rentals, but also include draft if no results
      filter.status = { $in: ['active', 'draft'] };
    }
    
    const skip = (page - 1) * limit;
    const [rentals, total] = await Promise.all([
      Rental.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('host', 'name')
        .populate('spot', 'spotNumber zone city'),
      Rental.countDocuments(filter),
    ]);
    res.json({ success: true, data: rentals, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/my ──────────────────────────────────────────────────────
exports.getMyRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ host: req.user.id }).sort({ createdAt: -1 }).populate('spot', 'spotNumber zone');
    res.json({ success: true, data: rentals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/:id ─────────────────────────────────────────────────────
exports.getRentalById = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('host', 'name email').populate('spot');
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/rentals/:id ─────────────────────────────────────────────────────
exports.updateRental = async (req, res) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, host: req.user.id });
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found or not yours' });
    if (rental.status === 'suspended') return res.status(403).json({ success: false, message: 'Suspended rentals cannot be edited' });

    const allowed = ['title','description','dailyRate','weeklyRate','monthlyRate','depositAmount','vehicle','availableFrom','availableTo','status'];
    for (const key of allowed) { if (req.body[key] !== undefined) rental[key] = req.body[key]; }

    rental.auditLog.push({ action: 'updated', by: req.user.id, note: 'Host updated listing' });
    await rental.save();
    res.json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/rentals/:id ──────────────────────────────────────────────────
exports.deleteRental = async (req, res) => {
  try {
    const rental = await Rental.findOneAndDelete({ _id: req.params.id, host: req.user.id });
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    res.json({ success: true, message: 'Rental deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/rentals/:id/audit (admin) ───────────────────────────────────────
exports.auditRental = async (req, res) => {
  try {
    const { action, note } = req.body; // approve, suspend, activate
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    if (action === 'approve') {
      rental.approvedByAdmin = true;
      rental.approvedAt      = new Date();
      rental.status          = 'active';
    } else if (action === 'suspend') {
      rental.status = 'suspended';
    } else if (action === 'activate') {
      rental.status = 'active';
    }

    rental.auditLog.push({ action, by: req.user.id, note: note || `Admin action: ${action}` });
    await rental.save();
    res.json({ success: true, data: rental });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/admin/all (admin) ───────────────────────────────────────
exports.getAllRentals = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [rentals, total] = await Promise.all([
      Rental.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).populate('host', 'name email').populate('spot', 'spotNumber zone'),
      Rental.countDocuments(filter),
    ]);
    res.json({ success: true, data: rentals, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/rentals/seed (dev helper) ──────────────────────────────────────
exports.seedRentals = async (req, res) => {
  try {
    // Get first admin and first created user to be hosts
    const User = require('../models/User');
    const users = await User.find().limit(2);
    if (users.length < 1) {
      return res.status(400).json({ success: false, message: 'Need at least 1 user to seed rentals' });
    }

    // Get first available parking spots
    const spots = await ParkingSpot.find().limit(5);
    if (spots.length < 1) {
      return res.status(400).json({ success: false, message: 'Need parking spots to seed rentals' });
    }

    // Clear existing rental data for clean seeding
    await Rental.deleteMany({});

    const seedRentals = [
      {
        host: users[0]._id,
        spot: spots[0]._id,
        title: '🚗 Premium Honda City - Downtown Location',
        description: 'Well-maintained Honda City with AC, GPS and backup camera. Perfect for daily commute or weekend trips.',
        vehicle: {
          make: 'Honda',
          model: 'City',
          year: 2023,
          licensePlate: 'MH12AB1234',
          type: 'car',
          features: ['GPS', 'AC', 'Bluetooth', 'Backup Camera'],
        },
        dailyRate: 1500,
        weeklyRate: 9000,
        monthlyRate: 35000,
        depositAmount: 5000,
        status: 'active',
        approvedByAdmin: true,
      },
      {
        host: users[0]._id,
        spot: spots[1]._id,
        title: '⚡ Tesla Model 3 - EV Charging Included',
        description: 'Eco-friendly electric vehicle with 450km range. Includes free charging at our locations.',
        vehicle: {
          make: 'Tesla',
          model: 'Model 3',
          year: 2024,
          licensePlate: 'KA01EV5678',
          type: 'ev',
          features: ['GPS', 'EV Charger', 'Sunroof', 'Bluetooth'],
        },
        dailyRate: 2500,
        weeklyRate: 15000,
        monthlyRate: 60000,
        depositAmount: 10000,
        status: 'active',
        approvedByAdmin: true,
      },
      {
        host: users[users.length > 1 ? 1 : 0]._id,
        spot: spots[2]._id,
        title: '🏍️ Royal Enfield Classic 350 - Adventure Ready',
        description: 'Powerful motorcycle for long rides. Recently serviced with new tires.',
        vehicle: {
          make: 'Royal Enfield',
          model: 'Classic 350',
          year: 2022,
          licensePlate: 'DL3MO0001',
          type: 'motorcycle',
          features: ['GPS'],
        },
        dailyRate: 800,
        weeklyRate: 4500,
        monthlyRate: 15000,
        depositAmount: 3000,
        status: 'active',
        approvedByAdmin: true,
      },
      {
        host: users[0]._id,
        spot: spots[3]._id,
        title: '🚛 Mahindra Bolero - Cargo & Family Trips',
        description: 'Spacious SUV perfect for family outings or light cargo transport. 7 seater.',
        vehicle: {
          make: 'Mahindra',
          model: 'Bolero',
          year: 2023,
          licensePlate: 'TN09SU4321',
          type: 'suv',
          features: ['AC', 'GPS', 'Child Seat'],
        },
        dailyRate: 2000,
        weeklyRate: 12000,
        monthlyRate: 48000,
        depositAmount: 8000,
        status: 'draft',
        approvedByAdmin: false,
      },
      {
        host: users[users.length > 1 ? 1 : 0]._id,
        spot: spots[4]._id,
        title: '🚗 Maruti Swift - Budget Friendly',
        description: 'Reliable and fuel-efficient hatchback. Great for solo travelers or couples.',
        vehicle: {
          make: 'Maruti',
          model: 'Swift',
          year: 2021,
          licensePlate: 'MH14HT7890',
          type: 'car',
          features: ['AC', 'Bluetooth'],
        },
        dailyRate: 1000,
        weeklyRate: 5500,
        monthlyRate: 22000,
        depositAmount: 3000,
        status: 'active',
        approvedByAdmin: true,
      },
    ];

    const created = await Rental.create(seedRentals);
    res.status(201).json({
      success: true,
      message: `Created ${created.length} test rentals`,
      data: created,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
