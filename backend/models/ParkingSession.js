const mongoose = require('mongoose');

const parkingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    spotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpot',
      required: true,
    },
    vehicleId: { type: String }, // sub-document _id from user.vehicles
    licensePlate: { type: String, required: true, uppercase: true, trim: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // total hours (decimal)
    hourlyRate: { type: Number, required: true },
    amount: { type: Number, default: 0 }, // total cost in USD
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index for fast lookups of active sessions per user
parkingSessionSchema.index({ userId: 1, status: 1 });
parkingSessionSchema.index({ userId: 1, createdAt: -1 });

// Compute duration and amount before saving when session ends
parkingSessionSchema.pre('save', function (next) {
  if (this.endTime && this.startTime) {
    const msElapsed = new Date(this.endTime) - new Date(this.startTime);
    this.duration = Math.max(msElapsed / (1000 * 60 * 60), 0.25); // minimum 15 min
    this.amount = parseFloat((this.duration * this.hourlyRate).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('ParkingSession', parkingSessionSchema);
