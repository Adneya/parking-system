const mongoose = require('mongoose');

// Sensor reading sub-schema
const sensorReadingSchema = new mongoose.Schema({
  timestamp:   { type: Date, default: Date.now },
  weightKg:    { type: Number, default: 0 },  // load cell reading
  occupied:    { type: Boolean, default: false },
  vehicleType: { type: String },               // inferred from weight
}, { _id: false });

const spotSensorSchema = new mongoose.Schema({
  spot:   { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true, unique: true },
  zone:   { type: String, required: true },
  bay:    { type: String, required: true },

  // latest live reading
  currentWeight: { type: Number, default: 0 },
  isOccupied:    { type: Boolean, default: false },
  inferredType:  { type: String, enum: ['empty', 'motorcycle', 'car', 'suv', 'truck', 'unknown'], default: 'empty' },
  lastUpdated:   { type: Date, default: Date.now },

  // rolling history (last 1440 minutes = 24h)
  readings: { type: [sensorReadingSchema], default: [] },

  // maintenance flags
  sensorFaulty:    { type: Boolean, default: false },
  calibrationValue:{ type: Number, default: 0 },
  batteryLevel:    { type: Number, default: 100 }, // %

  // ML features
  avgDailyOccupancy: { type: Number, default: 0 },   // 0-1
  peakHours:         { type: [Number], default: [] }, // hours of day (0-23)
}, { timestamps: true });

// Infer vehicle type from weight
spotSensorSchema.methods.inferVehicleType = function () {
  const w = this.currentWeight;
  if (w < 5)    return 'empty';
  if (w < 150)  return 'motorcycle';
  if (w < 1800) return 'car';
  if (w < 2500) return 'suv';
  return 'truck';
};

spotSensorSchema.index({ spot: 1 });
spotSensorSchema.index({ zone: 1, isOccupied: 1 });

module.exports = mongoose.model('SpotSensor', spotSensorSchema);
