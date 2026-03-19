const mongoose = require('mongoose');

const damageReportSchema = new mongoose.Schema({
  confidence: { type: Number, default: 0 },   // 0-1
  location:   { type: String },               // 'front', 'rear', 'left', 'right', 'roof'
  severity:   { type: String, enum: ['minor', 'moderate', 'severe'] },
  description:{ type: String },
}, { _id: false });

const vehicleInspectionSchema = new mongoose.Schema({
  booking:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  rental:      { type: mongoose.Schema.Types.ObjectId, ref: 'Rental' },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  licensePlate:{ type: String, required: true, uppercase: true },
  // CV license plate recognition
  detectedPlate:     { type: String },
  plateConfidence:   { type: Number, default: 0 },
  plateMatchResult:  { type: String, enum: ['match', 'mismatch', 'unreadable', 'pending'], default: 'pending' },

  // CV damage detection
  imageUrls:         [String],        // base64 data URLs or S3 keys
  damageDetected:    { type: Boolean, default: false },
  damageReports:     [damageReportSchema],
  overallDamageScore:{ type: Number, default: 0 }, // 0-100

  // inspection type
  inspectionType: { type: String, enum: ['check_in', 'check_out'], required: true },
  inspectedAt:    { type: Date, default: Date.now },
  autoApproved:   { type: Boolean, default: false },
  reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin
  reviewNotes:    { type: String },
}, { timestamps: true });

vehicleInspectionSchema.index({ licensePlate: 1 });
vehicleInspectionSchema.index({ booking: 1, inspectionType: 1 });
vehicleInspectionSchema.index({ damageDetected: 1 });

module.exports = mongoose.model('VehicleInspection', vehicleInspectionSchema);
