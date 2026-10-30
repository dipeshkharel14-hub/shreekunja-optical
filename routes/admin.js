/**
 * routes/admin.js
 * Mounted at /api/admin. Admin auth + dashboard + audit logs +
 * admin-account status (activate/deactivate — never create/delete).
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { identify } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const { requireRole, requirePermission } = require('../middleware/roleGuard');
const { loginLimiter } = require('../middleware/rateLimit');

// Admin auth
router.post('/login', loginLimiter, authController.adminLogin);
router.post('/logout', identify, authController.adminLogout);
router.get('/me', identify, requireAdmin, authController.adminMe);

// Dashboard — any active admin
router.get('/dashboard', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), adminController.dashboard);

// Audit logs — full log is SUPER_ADMIN-only (spec section 28)
router.get('/audit-logs', identify, requireAdmin, requirePermission('audit_logs_full'), adminController.auditLogs);

// Admin account management — SUPER_ADMIN-only (spec section 16/48)
router.get('/admins', identify, requireAdmin, requirePermission('manage_admins'), adminController.listAdmins);
router.patch('/admins/:id/status', identify, requireAdmin, requirePermission('manage_admins'), adminController.setAdminActive);

module.exports = router;
