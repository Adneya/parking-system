const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  spot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
  vehicle: {
    licensePlate: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['car', 'motorcycle', 'suv', 'truck', 'ev'], default: 'car' },
    make: String,
    model: String,
  },
  scheduledStart: { type: Date, required: true },
  scheduledEnd:   { type: Date, required: true },
  actualStart:    { type: Date },
  actualEnd:      { type: Date },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  },
  // ML allocated slot info
  mlScore:         { type: Number, default: 0 },
  mlRebalanced:    { type: Boolean, default: false },
  rebalanceReason: { type: String },

  // pricing
  baseRate:    { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  currency:    { type: String, default: 'INR' },
  isPaid:      { type: Boolean, default: false },
  paymentRef:  { type: String },

  // check-in QR
  qrCode:      { type: String },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason:{ type: String },
}, { timestamps: true });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ spot: 1, scheduledStart: 1, scheduledEnd: 1 });
bookingSchema.index({ scheduledStart: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
