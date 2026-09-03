const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// ============================================
// UPLOAD ROUTES
// ============================================

// Upload single file
router.post(
  '/upload',
  upload.single('file'),
  handleUploadError,
  mediaController.uploadSingle
);

// Upload multiple files
router.post(
  '/upload-multiple',
  upload.array('files', 10),
  handleUploadError,
  mediaController.uploadMultiple
);

// ============================================
// GET ROUTES
// ============================================

// Get user's media
router.get('/', mediaController.getUserMedia);

// Get single media
router.get('/:id', mediaController.getMedia);

// ============================================
// DELETE ROUTE
// ============================================

// Delete media
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;