const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
// const { requireAdmin } = require('../middleware/auth'); // if you have role-checking middleware

router.use(authenticate);

// Member-facing
router.post('/', reportController.createReport);              // report a post/comment
router.get('/my-reports', reportController.getMyReports);      // reports I've filed
router.get('/count/:targetType/:targetId', reportController.getReportCount);

// Moderator/Admin-facing
// TODO: add requireAdmin/requireModerator middleware once roles-based access is ready
router.get('/', reportController.getAllReports);               // moderation queue
router.put('/:id/review', reportController.reviewReport);      // resolve/dismiss a report

module.exports = router;