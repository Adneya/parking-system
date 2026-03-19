const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

// Public
router.get('/plans', paymentController.getPlans);

// Protected — Bank Account
router.post('/bank/connect',     authMiddleware.authenticate, paymentController.connectBankAccount);
router.post('/bank/verify',      authMiddleware.authenticate, paymentController.verifyBankAccount);
router.get('/bank/details',      authMiddleware.authenticate, paymentController.getBankAccount);
router.delete('/bank/disconnect', authMiddleware.authenticate, paymentController.disconnectBankAccount);

// Protected — card
router.post('/create-intent', authMiddleware.authenticate, paymentController.createPaymentIntent);
router.post('/simulate',      authMiddleware.authenticate, paymentController.simulatePayment);

// Protected — UPI
router.post('/upi/initiate',  authMiddleware.authenticate, paymentController.initiateUpiPayment);
router.post('/upi/verify',    authMiddleware.authenticate, paymentController.verifyUpiPayment);

// Protected — QR
router.post('/qr/generate',   authMiddleware.authenticate, paymentController.generateQrPayment);

module.exports = router;
