const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/bookingController');
const auth    = require('../middleware/auth');

const A = auth.authenticate;
const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

router.get('/ml-allocate',       A,  ctrl.mlAllocate);
router.post('/',                 A,  ctrl.createBooking);
router.get('/',                  A,  ctrl.getUserBookings);
router.get('/admin/all',         AA, ctrl.getAllBookings);
router.get('/:id',               A,  ctrl.getBookingById);
router.put('/:id/cancel',        A,  ctrl.cancelBooking);
router.post('/admin/rebalance',  AA, ctrl.triggerRebalance);

module.exports = router;
