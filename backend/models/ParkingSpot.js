const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    totalSpots: { type: Number, required: true, default: 50, min: 1 },
    availableSpots: { type: Number, required: true, default: 50, min: 0 },
    hourlyRate: { type: Number, required: true, default: 2.5, min: 0 },
    dailyRate: { type: Number, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    amenities: [{ type: String }], // e.g. 'covered', 'ev_charging', 'security', 'handicap', 'cctv'
    operatingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
      is24Hours: { type: Boolean, default: true },
    },
    images: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

parkingSpotSchema.index({ location: '2dsphere' });
parkingSpotSchema.index({ status: 1 });
parkingSpotSchema.index({ city: 1 });

// Virtual: occupancy percentage
parkingSpotSchema.virtual('occupancyRate').get(function () {
  if (!this.totalSpots) return 0;
  return (((this.totalSpots - this.availableSpots) / this.totalSpots) * 100).toFixed(1);
});

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
