const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rentalController');
const auth    = require('../middleware/auth');

const A = auth.authenticate;
const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

router.get('/my',            A,  ctrl.getMyRentals);
router.get('/admin/all',     AA, ctrl.getAllRentals);
router.post('/seed',         ctrl.seedRentals);  // Dev helper - no auth required
router.post('/',             A,  ctrl.createRental);
router.get('/',              A,  ctrl.listRentals);
router.get('/:id',           A,  ctrl.getRentalById);
router.put('/:id',           A,  ctrl.updateRental);
router.delete('/:id',        A,  ctrl.deleteRental);
router.put('/:id/audit',     AA, ctrl.auditRental);

module.exports = router;
