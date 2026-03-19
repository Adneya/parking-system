const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/inspectionController');
const auth    = require('../middleware/auth');

const A = auth.authenticate;
const AA = [auth.authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
}];

router.post('/',              A,  ctrl.submitInspection);
router.get('/',               A,  ctrl.getUserInspections);
router.get('/admin',          AA, ctrl.getAllInspections);
router.put('/:id/review',     AA, ctrl.reviewInspection);

module.exports = router;
