const mongoose = require('mongoose');

const rentalBookingSchema = new mongoose.Schema({
  renter:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rental:      { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },

  // Date range
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  daysBooked:  { type: Number, default: 1 }, // calculated field

  // Location
  pickupLocation:   String,
  dropoffLocation:  String,

  // Pricing
  pricePerDay:      { type: Number, required: true },
  depositAmount:    { type: Number, default: 0 },
  totalAmount:      { type: Number, required: true },
  discountAmount:   { type: Number, default: 0 },
  discountReason:   String,
  currency:         { type: String, default: 'INR' },

  // Payment
  isPaid:           { type: Boolean, default: false },
  paymentMethod:    { type: String, enum: ['upi', 'card', 'bank_transfer'], default: 'upi' },
  paymentId:        String, // external payment gateway ID
  paymentDate:      Date,
  paymentStatus:    { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },

  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  },

  // Damage & Returns
  damageReport:     String,
  damageAmount:     { type: Number, default: 0 },
  returnedAt:       Date,
  returnCondition:  { type: String, enum: ['good', 'minor_damage', 'major_damage', 'lost'] },

  // Tracking
  rentalNotes:      String,
  cancellationReason: String,
  cancelledAt:      Date,

  // Audit trail
  history: [{
    action:     String,
    timestamp:  { type: Date, default: Date.now },
    note:       String,
  }],

}, { timestamps: true });

// Auto-calculate days and amounts
rentalBookingSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.daysBooked = Math.max(1, diffDays);
    if (!this.totalAmount || this.totalAmount === 0) {
      this.totalAmount = (this.pricePerDay * this.daysBooked) + this.depositAmount;
    }
  }
  next();
});

rentalBookingSchema.index({ renter: 1, status: 1 });
rentalBookingSchema.index({ rental: 1, startDate: 1, endDate: 1 });
rentalBookingSchema.index({ status: 1, startDate: 1 });
rentalBookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RentalBooking', rentalBookingSchema);
