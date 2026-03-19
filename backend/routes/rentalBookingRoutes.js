const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rentalBookingController');
const auth = require('../middleware/auth');

const A = auth.authenticate;

// Create booking
router.post('/', A, ctrl.createBooking);

// Get my bookings
router.get('/', A, ctrl.getMyBookings);

// Get booking details
router.get('/:id', A, ctrl.getBookingById);

// Cancel booking
router.put('/:id/cancel', A, ctrl.cancelBooking);

// Confirm payment
router.put('/:id/confirm-payment', A, ctrl.confirmPayment);

// Mark as returned (host only)
router.put('/:id/return', A, ctrl.markAsReturned);

// Check availability for dates
router.get('/rental/:rentalId/availability', A, ctrl.checkAvailability);

// Get booked dates for calendar
router.get('/rental/:rentalId/booked-dates', A, ctrl.getBookedDates);

// Get active booking for rental (host only)
router.get('/rental/:rentalId/active', A, ctrl.getActiveBooking);

module.exports = router;
