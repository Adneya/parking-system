const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/sensorController');
const auth    = require('../middleware/auth');

const A = auth.authenticate;
const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

router.get('/floor-map',      A,  ctrl.getFloorMap);
router.get('/stats',          AA, ctrl.getSensorStats);
router.get('/:spotId',        AA, ctrl.getSpotSensor);
router.post('/update',        AA, ctrl.updateSensorReading);
router.post('/bulk-update',   AA, ctrl.bulkUpdateSensors);

module.exports = router;
