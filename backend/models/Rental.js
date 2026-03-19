const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  spot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },

  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // rental vehicle info (if host is renting out a vehicle alongside the spot)
  vehicle: {
    make:         String,
    model:        String,
    year:         Number,
    licensePlate: String,
    type:         { type: String, enum: ['car', 'motorcycle', 'suv', 'truck', 'ev'] },
    fuelType:     { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid'] },
    seats:        Number,
    features:     [String],
    images:       [String],
  },

  // pricing
  dailyRate:    { type: Number, required: true },
  weeklyRate:   { type: Number },
  monthlyRate:  { type: Number },
  depositAmount:{ type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },

  // availability
  availableFrom: { type: Date },
  availableTo:   { type: Date },
  minDays:       { type: Number, default: 1 },
  maxDays:       { type: Number, default: 365 },

  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'rented', 'under_audit', 'suspended'],
    default: 'draft',
  },

  // audit trail
  auditLog: [{
    action:    String,
    by:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note:      String,
    timestamp: { type: Date, default: Date.now },
  }],

  // stats
  totalBookings: { type: Number, default: 0 },
  totalRevenue:  { type: Number, default: 0 },
  rating:        { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:   { type: Number, default: 0 },

  approvedByAdmin: { type: Boolean, default: false },
  approvedAt:      { type: Date },
}, { timestamps: true });

rentalSchema.index({ host: 1, status: 1 });
rentalSchema.index({ spot: 1 });
rentalSchema.index({ status: 1, approvedByAdmin: 1 });

module.exports = mongoose.model('Rental', rentalSchema);
