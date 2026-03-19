/**
 * inspectionController.js
 * Computer vision for damage detection + license plate recognition (simulated)
 */
const mongoose = require('mongoose');
const VehicleInspection = require('../models/VehicleInspection');
const MaintenanceAlert    = require('../models/MaintenanceAlert');

function normalizePlate(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function hashString(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Helper: Check if string is valid MongoDB ObjectId (24 hex chars or valid BSON ObjectId)
function isValidObjectId(id) {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

// ─── Simulated CV license plate recognition ───────────────────────────────────
// In production replace this with a real OCR/ML model call (e.g. OpenALPR, AWS Rekognition)
function simulatePlateRecognition(imageBase64, expectedPlate) {
  const cleanedExpected = normalizePlate(expectedPlate);
  const seed = hashString(String(imageBase64 || '').slice(0, 600));

  if (cleanedExpected) {
    const confidence = 0.86 + ((seed % 12) / 100); // 0.86 .. 0.97
    return { plate: cleanedExpected, confidence: +confidence.toFixed(2) };
  }

  const plates = ['MH12AB1234', 'KA01XY5678', 'DL3CAZ0001', 'TN09CD4321', 'MH14EF7890'];
  const plate = plates[seed % plates.length];
  const confidence = 0.72 + ((seed % 20) / 100);
  return { plate, confidence: +confidence.toFixed(2) };
}

// ─── Simulated CV damage detection ────────────────────────────────────────────
// In production replace with YOLO / detectron2 model call
function simulateDamageDetection(imageBase64, index = 0) {
  const seed = hashString(`${String(imageBase64 || '').slice(0, 800)}:${index}`);
  const hasDamage = (seed % 100) >= 25;
  if (!hasDamage) {
    // No damage
    return { damageDetected: false, reports: [], score: 0 };
  }

  const locations = ['front', 'rear', 'left', 'right', 'roof'];
  const severities = ['minor', 'moderate', 'severe'];
  const numDamages = 1 + (seed % 2);
  const reports = [];
  for (let i = 0; i < numDamages; i++) {
    const sev = severities[(seed + i) % severities.length];
    const loc = locations[(seed + i * 3) % locations.length];
    const conf = 0.62 + (((seed >> (i + 1)) % 34) / 100);
    reports.push({
      confidence: +conf.toFixed(2),
      location:   loc,
      severity:   sev,
      description:`${sev.charAt(0).toUpperCase() + sev.slice(1)} damage detected at ${loc} panel`,
    });
  }
  const score = reports.reduce((acc, r) => {
    const w = { minor: 20, moderate: 50, severe: 80 };
    return acc + w[r.severity] * r.confidence;
  }, 0) / reports.length;

  return { damageDetected: true, reports, score: Math.min(100, Math.round(score)) };
}

function aggregateDamageDetection(images) {
  const allReports = [];
  for (let i = 0; i < images.length; i += 1) {
    const result = simulateDamageDetection(images[i], i);
    if (result.damageDetected) {
      allReports.push(...result.reports);
    }
  }

  if (allReports.length === 0) {
    return { damageDetected: false, reports: [], score: 0 };
  }

  const score = allReports.reduce((acc, r) => {
    const w = { minor: 20, moderate: 50, severe: 80 };
    return acc + w[r.severity] * r.confidence;
  }, 0) / allReports.length;

  return {
    damageDetected: true,
    reports: allReports,
    score: Math.min(100, Math.round(score)),
  };
}

// ─── POST /api/inspections ────────────────────────────────────────────────────
// Submit images for CV inspection (check_in or check_out)
exports.submitInspection = async (req, res) => {
  try {
    const imageBase64s = Array.isArray(req.body.imageBase64s)
      ? req.body.imageBase64s
      : (Array.isArray(req.body.images) ? req.body.images : []);
    const bookingId = req.body.bookingId || req.body.sessionId;
    const rentalId = req.body.rentalId;
    const { licensePlate, inspectionType } = req.body;
    
    if (!licensePlate || !inspectionType) {
      return res.status(400).json({ success: false, message: 'licensePlate and inspectionType are required' });
    }
    if (!['check_in', 'check_out'].includes(inspectionType)) {
      return res.status(400).json({ success: false, message: 'inspectionType must be check_in or check_out' });
    }
    if (imageBase64s.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required' });
    }

    // Run CV simulations using uploaded images
    const plateResult = simulatePlateRecognition(imageBase64s[0], licensePlate);
    const damageResult = aggregateDamageDetection(imageBase64s);

    let plateMatchResult = 'pending';
    if (plateResult) {
      const detected = normalizePlate(plateResult.plate);
      const provided = normalizePlate(licensePlate);
      plateMatchResult = detected === provided ? 'match' : (plateResult.confidence < 0.5 ? 'unreadable' : 'mismatch');
    }

    // Build inspection data with validated ObjectIds
    const inspectionData = {
      user:    req.user.id,
      licensePlate,
      detectedPlate:      plateResult?.plate,
      plateConfidence:    plateResult?.confidence || 0,
      plateMatchResult,
      imageUrls:          imageBase64s.map((_, i) => `img_${Date.now()}_${i}`),
      damageDetected:     damageResult.damageDetected,
      damageReports:      damageResult.reports,
      overallDamageScore: damageResult.score,
      inspectionType,
      autoApproved:       !damageResult.damageDetected && plateMatchResult === 'match',
    };

    // Only add booking/rental if valid ObjectIds (NOT test IDs like "123")
    if (bookingId && isValidObjectId(bookingId)) {
      inspectionData.booking = bookingId;
    }
    if (rentalId && isValidObjectId(rentalId)) {
      inspectionData.rental = rentalId;
    }

    const inspection = await VehicleInspection.create(inspectionData);

    // Auto-raise maintenance alert if damage found
    if (damageResult.damageDetected) {
      await MaintenanceAlert.create({
        targetType: 'vehicle', targetRef: licensePlate,
        alertType: 'vehicle_damage', severity: damageResult.score > 60 ? 'critical' : 'warning',
        title: `Damage detected on ${licensePlate}`,
        description: damageResult.reports.map(r => r.description).join('; '),
        mlConfidence: damageResult.reports[0]?.confidence || 0,
      });
    }

    res.status(201).json({ success: true, data: inspection });
  } catch (err) {
    console.error('submitInspection error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/inspections ─────────────────────────────────────────────────────
exports.getUserInspections = async (req, res) => {
  try {
    const inspections = await VehicleInspection.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: inspections });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/inspections/admin (admin) ───────────────────────────────────────
exports.getAllInspections = async (req, res) => {
  try {
    const { damageOnly, limit = 30, page = 1 } = req.query;
    const filter = {};
    if (damageOnly === 'true') filter.damageDetected = true;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      VehicleInspection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).populate('user', 'name email'),
      VehicleInspection.countDocuments(filter),
    ]);
    res.json({ success: true, data: items, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/inspections/:id/review (admin) ──────────────────────────────────
exports.reviewInspection = async (req, res) => {
  try {
    const { reviewNotes, autoApproved } = req.body;
    const inspection = await VehicleInspection.findByIdAndUpdate(
      req.params.id,
      { reviewNotes, autoApproved, reviewedBy: req.user.id },
      { new: true }
    );
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
