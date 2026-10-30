/**
 * routes/orders.js
 * Mounted at /api/orders.
 */

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { identify, requireCustomer } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const { requireRole } = require('../middleware/roleGuard');

// Customers (or guests) can place orders; identify (not requireCustomer)
// so guest checkout works while still attaching customer_id when logged in.
router.post('/', identify, orderController.create);
// Guest-safe order lookup: order number + matching phone are both required.
router.post('/track', identify, orderController.trackByCredentials);

router.get('/mine', identify, requireCustomer, orderController.listMine);
router.get('/:orderNumber', identify, orderController.getByOrderNumber);

// Admin
router.get('/', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), orderController.listForAdmin);
router.patch('/:id/status', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), orderController.updateStatus);
router.patch('/:id/payment', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), orderController.updatePaymentStatus);

module.exports = router;
