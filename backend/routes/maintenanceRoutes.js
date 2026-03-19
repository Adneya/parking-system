const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/maintenanceController');
const auth    = require('../middleware/auth');

const A = auth.authenticate;
const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

router.get('/summary',     A,  ctrl.getSummary);
router.get('/predict',     AA, ctrl.runPredictiveScan);
router.get('/alerts',      A,  ctrl.getAlerts);
router.post('/alerts',     AA, ctrl.createAlert);
router.put('/alerts/:id',  A,  ctrl.updateAlert);  // any authenticated user can update status

module.exports = router;
