/**
 * rentalBookingController.js
 * Rental vehicle booking management - create, manage, and track bookings
 */
const RentalBooking = require('../models/RentalBooking');
const Rental = require('../models/Rental');
const User = require('../models/User');
const mongoose = require('mongoose');

// ─── Helper: Check date overlap ────────────────────────────────────────────────
async function hasDateConflict(rentalId, startDate, endDate, excludeBookingId = null) {
  const filter = {
    rental: rentalId,
    status: { $in: ['confirmed', 'active'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  const conflict = await RentalBooking.findOne(filter);
  return !!conflict;
}

// ─── POST /api/rental-bookings ─────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { rentalId, startDate, endDate, pickupLocation, dropoffLocation, rentalNotes } = req.body;

    // Validate required fields
    if (!rentalId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'rentalId, startDate and endDate are required' 
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date must be before end date' 
      });
    }
    if (start < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot book dates in the past' 
      });
    }

    // Fetch rental details
    const rental = await Rental.findById(rentalId).populate('host', 'name email');
    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }
    if (rental.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Rental is ${rental.status}, not available for booking` 
      });
    }

    // Check availability
    const hasConflict = await hasDateConflict(rentalId, start, end);
    if (hasConflict) {
      return res.status(409).json({ 
        success: false, 
        message: 'Rental is not available for selected dates' 
      });
    }

    // Calculate pricing
    const diffTime = Math.abs(end - start);
    const daysBooked = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalAmount = (rental.dailyRate * daysBooked) + (rental.depositAmount || 0);

    // Create booking
    const booking = await RentalBooking.create({
      renter: req.user.id,
      rental: rentalId,
      startDate: start,
      endDate: end,
      daysBooked,
      pickupLocation: pickupLocation || rental.spot?.location || 'TBD',
      dropoffLocation: dropoffLocation || rental.spot?.location || 'TBD',
      pricePerDay: rental.dailyRate,
      depositAmount: rental.depositAmount || 0,
      totalAmount,
      rentalNotes,
      status: 'pending', // Payment required before confirmation
      history: [{
        action: 'created',
        note: `Booking created for ${daysBooked} days`,
      }],
    });

    res.status(201).json({ 
      success: true, 
      data: booking,
      message: 'Booking created. Proceed to payment for confirmation.' 
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rental-bookings (my bookings) ────────────────────────────────────
exports.getMyBookings = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const filter = { renter: req.user.id };
    
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      RentalBooking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('rental', 'title vehicle dailyRate')
        .populate('rental.host', 'name email'),
      RentalBooking.countDocuments(filter),
    ]);

    res.json({ success: true, data: bookings, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rental-bookings/:id ─────────────────────────────────────────────
exports.getBookingById = async (req, res) => {
  try {
    const booking = await RentalBooking.findById(req.params.id)
      .populate('renter', 'name email phone')
      .populate({
        path: 'rental',
        populate: { path: 'host', select: 'name email phone' }
      });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check permission (renter or rental host or admin)
    const isRenter = booking.renter.toString() === req.user.id;
    const isHost = booking.rental.host._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isRenter && !isHost && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/rental-bookings/:id/cancel ──────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const booking = await RentalBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only renter can cancel (or admin)
    if (booking.renter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only renter can cancel' });
    }

    // Cannot cancel if already active or completed
    if (['active', 'completed', 'no_show'].includes(booking.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel booking with status: ${booking.status}` 
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    booking.cancelledAt = new Date();
    booking.history.push({
      action: 'cancelled',
      note: cancellationReason || 'Booking cancelled by renter',
    });

    // Handle refund
    if (booking.isPaid && booking.paymentStatus === 'completed') {
      booking.paymentStatus = 'refunded';
      booking.history.push({
        action: 'refund_initiated',
        note: 'Full refund initiated',
      });
    }

    await booking.save();

    res.json({ 
      success: true, 
      data: booking,
      message: 'Booking cancelled successfully' 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/:id/availability ────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'startDate and endDate query parameters required' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date must be before end date' 
      });
    }

    const hasConflict = await hasDateConflict(rentalId, start, end);

    res.json({
      success: true,
      available: !hasConflict,
      message: hasConflict ? 'Rental not available for these dates' : 'Rental available'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/:id/booked-dates ────────────────────────────────────────
exports.getBookedDates = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { days = 90 } = req.query;

    const fromDate = new Date();
    const toDate = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);

    const bookings = await RentalBooking.find({
      rental: rentalId,
      status: { $in: ['confirmed', 'active'] },
      startDate: { $lt: toDate },
      endDate: { $gt: fromDate },
    }).select('startDate endDate status');

    const bookedIntervals = bookings.map(b => ({
      start: b.startDate,
      end: b.endDate,
      status: b.status,
    }));

    res.json({ 
      success: true, 
      bookedIntervals,
      fromDate,
      toDate 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/rental-bookings/:id/confirm-payment ───────────────────────────────
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentId, paymentMethod } = req.body;

    // Validate booking ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid booking ID' 
      });
    }

    // Validate payment info
    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID is required' 
      });
    }

    const booking = await RentalBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.renter.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot process payment for booking with status: ${booking.status}` 
      });
    }

    // Update payment info
    booking.isPaid = true;
    booking.paymentId = paymentId;
    booking.paymentMethod = paymentMethod || 'upi';
    booking.paymentStatus = 'completed';
    booking.paymentDate = new Date();
    booking.status = 'confirmed';

    booking.history.push({
      action: 'payment_confirmed',
      note: `Payment received via ${paymentMethod || 'upi'}`,
    });

    // Update rental stats
    await Rental.findByIdAndUpdate(
      booking.rental,
      {
        $inc: {
          totalBookings: 1,
          totalRevenue: booking.totalAmount,
        }
      }
    );

    await booking.save();

    res.json({ 
      success: true, 
      data: booking,
      message: 'Payment confirmed and booking confirmed'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/rental-bookings/:id/return ──────────────────────────────────────
exports.markAsReturned = async (req, res) => {
  try {
    const { returnCondition, damageReport, damageAmount } = req.body;
    const booking = await RentalBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only rental host or admin can mark as returned
    const rental = await Rental.findById(booking.rental);
    if (rental.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Only active bookings can be marked as returned (current: ${booking.status})` 
      });
    }

    booking.status = 'completed';
    booking.returnedAt = new Date();
    booking.returnCondition = returnCondition || 'good';
    booking.damageReport = damageReport;
    booking.damageAmount = damageAmount || 0;

    booking.history.push({
      action: 'returned',
      note: `Vehicle returned in ${returnCondition || 'good'} condition${damageReport ? ': ' + damageReport : ''}`,
    });

    // Apply damage charges if any
    if (damageAmount > 0) {
      booking.totalAmount += damageAmount;
      booking.history.push({
        action: 'damage_charge_applied',
        note: `Damage charge: ₹${damageAmount}`,
      });
    }

    await booking.save();

    res.json({ 
      success: true, 
      data: booking,
      message: 'Booking marked as completed'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/rentals/:id/active-booking (for host) ───────────────────────────
exports.getActiveBooking = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const booking = await RentalBooking.findOne({
      rental: rentalId,
      status: 'active',
    }).populate('renter', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'No active booking found' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
