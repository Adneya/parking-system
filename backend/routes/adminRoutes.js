const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const auth    = require('../middleware/auth');

const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

// Public — one-time bootstrap (auto-blocks once first admin exists)
router.post('/setup',      ctrl.setupAdmin);

router.get('/dashboard',   AA, ctrl.getDashboard);
router.get('/analytics',   AA, ctrl.getAnalytics);
router.get('/users',       AA, ctrl.getUsers);
router.put('/users/:id',   AA, ctrl.updateUser);
router.get('/spots',       AA, ctrl.getSpots);
router.put('/spots/:id',   AA, ctrl.updateSpot);

module.exports = router;
