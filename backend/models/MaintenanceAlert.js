const mongoose = require('mongoose');

const maintenanceAlertSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['spot', 'sensor', 'facility', 'vehicle', 'system'],
    required: true,
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetType' },
  targetRef:{ type: String }, // human-readable ID / bay number

  alertType: {
    type: String,
    enum: [
      'sensor_fault', 'sensor_battery_low', 'occupancy_anomaly',
      'structural_damage', 'lighting_failure', 'payment_terminal',
      'network_outage', 'predictive_wear', 'scheduled_service',
      'vehicle_damage', 'flood_risk', 'security_breach',
    ],
    required: true,
  },

  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
  },

  title:      { type: String, required: true },
  description:{ type: String },
  predictedFailureDate: { type: Date },
  mlConfidence:         { type: Number, default: 0 }, // 0-1

  status: {
    type: String,
    enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
    default: 'open',
  },

  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   { type: Date },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNote:{ type: String },

  notifiedAdmins: { type: Boolean, default: false },
}, { timestamps: true });

maintenanceAlertSchema.index({ status: 1, severity: 1 });
maintenanceAlertSchema.index({ targetType: 1, targetId: 1 });
maintenanceAlertSchema.index({ alertType: 1 });

module.exports = mongoose.model('MaintenanceAlert', maintenanceAlertSchema);
