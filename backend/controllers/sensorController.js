/**
 * sensorController.js
 * Vehicle weight sensing (load cells) + live floor map
 */
const SpotSensor  = require('../models/SpotSensor');
const ParkingSpot = require('../models/ParkingSpot');
const MaintenanceAlert = require('../models/MaintenanceAlert');

// Weight thresholds (kg)
const WEIGHT_THRESHOLDS = {
  empty:      5,
  motorcycle: 150,
  car:        1800,
  suv:        2500,
};

function inferVehicleType(weightKg) {
  if (weightKg < WEIGHT_THRESHOLDS.empty)      return 'empty';
  if (weightKg < WEIGHT_THRESHOLDS.motorcycle) return 'motorcycle';
  if (weightKg < WEIGHT_THRESHOLDS.car)        return 'car';
  if (weightKg < WEIGHT_THRESHOLDS.suv)        return 'suv';
  return 'truck';
}

// ─── POST /api/sensors/update (IoT device → server) ─────────────────────────
exports.updateSensorReading = async (req, res) => {
  try {
    const { spotId, weightKg, batteryLevel } = req.body;
    if (spotId === undefined || weightKg === undefined) {
      return res.status(400).json({ success: false, message: 'spotId and weightKg required' });
    }

    const inferredType = inferVehicleType(weightKg);
    const isOccupied   = inferredType !== 'empty';

    let sensor = await SpotSensor.findOne({ spot: spotId });
    if (!sensor) {
      const spot = await ParkingSpot.findById(spotId);
      if (!spot) return res.status(404).json({ success: false, message: 'Spot not found' });
      sensor = new SpotSensor({ spot: spotId, zone: spot.city || '', bay: spot.name || '' });
    }

    sensor.currentWeight = weightKg;
    sensor.isOccupied    = isOccupied;
    sensor.inferredType  = inferredType;
    sensor.lastUpdated   = new Date();
    if (batteryLevel !== undefined) sensor.batteryLevel = batteryLevel;

    // Rolling 24h history (keep last 1440 readings)
    sensor.readings.push({ timestamp: new Date(), weightKg, occupied: isOccupied, vehicleType: inferredType });
    if (sensor.readings.length > 1440) sensor.readings = sensor.readings.slice(-1440);

    // Update avgDailyOccupancy
    const occupied = sensor.readings.filter(r => r.occupied).length;
    sensor.avgDailyOccupancy = sensor.readings.length ? occupied / sensor.readings.length : 0;

    await sensor.save();

    // Auto-alert on battery low
    if (batteryLevel !== undefined && batteryLevel < 15) {
      const existing = await MaintenanceAlert.findOne({ targetId: spotId, alertType: 'sensor_battery_low', status: { $in: ['open', 'acknowledged'] } });
      if (!existing) {
        await MaintenanceAlert.create({
          targetType: 'sensor', targetId: spotId, targetRef: sensor.bay,
          alertType: 'sensor_battery_low', severity: 'warning',
          title: `Sensor battery low at bay ${sensor.bay}`,
          description: `Battery at ${batteryLevel}%. Replace soon.`,
        });
      }
    }

    res.json({ success: true, data: { isOccupied, inferredType, weightKg } });
  } catch (err) {
    console.error('updateSensorReading error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/sensors/floor-map ───────────────────────────────────────────────
// Returns live occupancy map for frontend visualization
exports.getFloorMap = async (req, res) => {
  try {
    const { zone, floor } = req.query;
    const spotFilter = { status: 'active' };
    if (zone) spotFilter.city = { $regex: `^${String(zone).trim()}$`, $options: 'i' };
    // floor is no longer a schema field; keep for backward-compatible API shape
    void floor;

    const spots   = await ParkingSpot.find(spotFilter).lean();
    const sensors = await SpotSensor.find({ spot: { $in: spots.map(s => s._id) } }).lean();
    const sensorMap = {};
    for (const sn of sensors) sensorMap[sn.spot.toString()] = sn;

    const floorMap = spots.map(s => ({
      _id:          s._id,
      spotNumber:   s.name,
      zone:         s.city,
      floor:        0,
      type:         'standard',
      isOccupied:   (s.availableSpots || 0) <= 0,
      isActive:     s.status === 'active',
      hourlyRate:   s.hourlyRate,
      amenities:    s.amenities,
      address:      s.address,
      city:         s.city,
      location:     s.location,
      availableSpots: s.availableSpots,
      totalSpots:   s.totalSpots,
      sensor: sensorMap[s._id.toString()] ? {
        weightKg:      sensorMap[s._id.toString()].currentWeight,
        inferredType:  sensorMap[s._id.toString()].inferredType,
        batteryLevel:  sensorMap[s._id.toString()].batteryLevel,
        lastUpdated:   sensorMap[s._id.toString()].lastUpdated,
        sensorFaulty:  sensorMap[s._id.toString()].sensorFaulty,
        avgOccupancy:  sensorMap[s._id.toString()].avgDailyOccupancy,
      } : null,
    }));

    res.json({ success: true, data: floorMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/sensors/:spotId ─────────────────────────────────────────────────
exports.getSpotSensor = async (req, res) => {
  try {
    const sensor = await SpotSensor.findOne({ spot: req.params.spotId });
    if (!sensor) return res.status(404).json({ success: false, message: 'No sensor data for this spot' });
    res.json({ success: true, data: sensor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/sensors/bulk-update (batch IoT update) ────────────────────────
exports.bulkUpdateSensors = async (req, res) => {
  try {
    const { readings } = req.body; // [{ spotId, weightKg, batteryLevel }]
    if (!Array.isArray(readings)) return res.status(400).json({ success: false, message: 'readings array required' });

    const results = [];
    for (const r of readings) {
      const inferredType = inferVehicleType(r.weightKg);
      const isOccupied   = inferredType !== 'empty';
      await SpotSensor.findOneAndUpdate(
        { spot: r.spotId },
        {
          $set: { currentWeight: r.weightKg, isOccupied, inferredType, lastUpdated: new Date(), ...(r.batteryLevel !== undefined && { batteryLevel: r.batteryLevel }) },
          $push: { readings: { $each: [{ timestamp: new Date(), weightKg: r.weightKg, occupied: isOccupied, vehicleType: inferredType }], $slice: -1440 } },
        },
        { upsert: false }
      );
      results.push({ spotId: r.spotId, isOccupied, inferredType });
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/sensors/stats ───────────────────────────────────────────────────
exports.getSensorStats = async (req, res) => {
  try {
    const sensors = await SpotSensor.find({}).lean();
    const total     = sensors.length;
    const occupied  = sensors.filter(s => s.isOccupied).length;
    const faulty    = sensors.filter(s => s.sensorFaulty).length;
    const lowBat    = sensors.filter(s => s.batteryLevel < 20).length;
    const byType    = {};
    for (const s of sensors) {
      byType[s.inferredType] = (byType[s.inferredType] || 0) + 1;
    }
    res.json({ success: true, data: { total, occupied, available: total - occupied, faulty, lowBattery: lowBat, byVehicleType: byType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
