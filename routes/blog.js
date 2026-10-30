/**
 * routes/blog.js
 * Mounted at /api/blog.
 */

const express = require('express');
const router = express.Router();

const blogController = require('../controllers/blogController');
const { identify } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const { requireRole } = require('../middleware/roleGuard');
const { validateBody } = require('../middleware/validation');

// Public
router.get('/', blogController.listPublished);
router.get('/admin', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), blogController.listForAdmin); // before /:slug
router.get('/:slug', blogController.getBySlug);

// Admin
router.post(
  '/',
  identify,
  requireAdmin,
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validateBody({ titleEn: { type: 'string', required: true } }),
  blogController.create
);
router.patch('/:id', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), blogController.update);
router.patch('/:id/publish', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), blogController.setPublished);
router.delete('/:id', identify, requireAdmin, requireRole(['SUPER_ADMIN', 'ADMIN']), blogController.remove);

module.exports = router;
