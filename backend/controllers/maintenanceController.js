/**
 * maintenanceController.js
 * Predictive maintenance alerts
 */
const MaintenanceAlert = require('../models/MaintenanceAlert');
const SpotSensor       = require('../models/SpotSensor');
const ParkingSpot      = require('../models/ParkingSpot');

// ─── POST /api/maintenance/alerts ─────────────────────────────────────────────
exports.createAlert = async (req, res) => {
  try {
    const alert = await MaintenanceAlert.create({ ...req.body, notifiedAdmins: false });
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/maintenance/alerts ──────────────────────────────────────────────
exports.getAlerts = async (req, res) => {
  try {
    const { status, severity, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;
    const skip = (page - 1) * limit;
    const [alerts, total] = await Promise.all([
      MaintenanceAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).populate('assignedTo', 'name'),
      MaintenanceAlert.countDocuments(filter),
    ]);
    res.json({ success: true, data: alerts, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/maintenance/alerts/:id ──────────────────────────────────────────
exports.updateAlert = async (req, res) => {
  try {
    const allowed = ['status','assignedTo','resolutionNote'];
    const update  = {};
    for (const k of allowed) { if (req.body[k] !== undefined) update[k] = req.body[k]; }
    if (update.status === 'resolved') { update.resolvedAt = new Date(); update.resolvedBy = req.user.id; }
    const alert = await MaintenanceAlert.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/maintenance/predict ─────────────────────────────────────────────
// Run a lightweight predictive pass over all sensors
exports.runPredictiveScan = async (req, res) => {
  try {
    const sensors = await SpotSensor.find({}).lean();
    const generated = [];

    for (const sn of sensors) {
      // 1. Battery prediction
      if (sn.batteryLevel < 20 && sn.batteryLevel >= 10) {
        const existing = await MaintenanceAlert.findOne({ targetId: sn.spot, alertType: 'sensor_battery_low', status: { $in: ['open','acknowledged'] } });
        if (!existing) {
          const a = await MaintenanceAlert.create({
            targetType: 'sensor', targetId: sn.spot, targetRef: sn.bay,
            alertType: 'sensor_battery_low', severity: 'warning',
            title: `Sensor ${sn.bay} battery at ${sn.batteryLevel}%`,
            description: 'Battery below 20%. Predicted failure within 3 days.',
            predictedFailureDate: new Date(Date.now() + 3 * 86400000),
            mlConfidence: 0.85,
          });
          generated.push(a._id);
        }
      }

      // 2. Sensor fault (no reading in > 10 min)
      if (sn.lastUpdated && (Date.now() - new Date(sn.lastUpdated).getTime()) > 600000) {
        const existing = await MaintenanceAlert.findOne({ targetId: sn.spot, alertType: 'sensor_fault', status: { $in: ['open','acknowledged'] } });
        if (!existing) {
          const a = await MaintenanceAlert.create({
            targetType: 'sensor', targetId: sn.spot, targetRef: sn.bay,
            alertType: 'sensor_fault', severity: 'critical',
            title: `Sensor ${sn.bay} offline`,
            description: `No reading received for > 10 minutes.`,
            mlConfidence: 0.95,
          });
          generated.push(a._id);
        }
      }

      // 3. Occupancy anomaly (avg > 95% for a bay = possible sensor stuck)
      if (sn.avgDailyOccupancy > 0.95 && sn.readings.length > 100) {
        const existing = await MaintenanceAlert.findOne({ targetId: sn.spot, alertType: 'occupancy_anomaly', status: { $in: ['open','acknowledged'] } });
        if (!existing) {
          const a = await MaintenanceAlert.create({
            targetType: 'sensor', targetId: sn.spot, targetRef: sn.bay,
            alertType: 'occupancy_anomaly', severity: 'warning',
            title: `Possible stuck sensor at bay ${sn.bay}`,
            description: `Occupancy at ${Math.round(sn.avgDailyOccupancy * 100)}% — may be faulty.`,
            mlConfidence: 0.70,
          });
          generated.push(a._id);
        }
      }
    }

    res.json({ success: true, data: { created: generated.length, alertIds: generated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/maintenance/summary ─────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const [open, critical, warning, inProgress, resolved, dismissed] = await Promise.all([
      MaintenanceAlert.countDocuments({ status: 'open' }),
      MaintenanceAlert.countDocuments({ severity: 'critical', status: { $nin: ['resolved','dismissed'] } }),
      MaintenanceAlert.countDocuments({ severity: 'warning',  status: { $nin: ['resolved','dismissed'] } }),
      MaintenanceAlert.countDocuments({ status: 'in_progress' }),
      MaintenanceAlert.countDocuments({ status: 'resolved' }),
      MaintenanceAlert.countDocuments({ status: 'dismissed' }),
    ]);
    const recentAlerts = await MaintenanceAlert.find({ status: { $in: ['open','acknowledged','in_progress'] } })
      .sort({ severity: 1, createdAt: -1 }).limit(5).lean();
    res.json({ success: true, data: { open, critical, warning, inProgress, resolved, dismissed, recentAlerts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
