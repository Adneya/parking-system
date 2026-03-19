const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authMiddleware = require('../middleware/auth');

// ─── SPOTS (Public) ───────────────────────────────────────────────────────────

// GET  /api/parking/spots            – list / search spots
router.get('/spots', parkingController.getSpots);

// GET  /api/parking/spots/:id        – single spot details
router.get('/spots/:id', parkingController.getSpot);

// POST /api/parking/spots/seed       – seed sample spots (dev helper)
router.post(
  '/spots/seed',
  authMiddleware.authenticate,
  parkingController.seedSpots
);

// POST /api/parking/spots            – create a spot (admin)
router.post(
  '/spots',
  authMiddleware.authenticate,
  parkingController.createSpot
);

// PUT  /api/parking/spots/:id        – update a spot (admin)
router.put(
  '/spots/:id',
  authMiddleware.authenticate,
  parkingController.updateSpot
);

// ─── SESSIONS (Private) ───────────────────────────────────────────────────────

// GET  /api/parking/sessions/active  – get user's active session
router.get(
  '/sessions/active',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  parkingController.getActiveSession
);

// GET  /api/parking/sessions/history – get user's session history
router.get(
  '/sessions/history',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  parkingController.getSessionHistory
);

// POST /api/parking/sessions/start   – start a new session
router.post(
  '/sessions/start',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  parkingController.startSession
);

// PUT  /api/parking/sessions/:id/end – end a session
router.put(
  '/sessions/:sessionId/end',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  parkingController.endSession
);

// PUT  /api/parking/sessions/:id/cancel – cancel a session
router.put(
  '/sessions/:sessionId/cancel',
  authMiddleware.authenticate,
  authMiddleware.checkAccountActive,
  parkingController.cancelSession
);

module.exports = router;
