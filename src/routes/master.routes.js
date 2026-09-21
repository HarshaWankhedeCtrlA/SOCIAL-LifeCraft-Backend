'use strict';

const express = require('express');
const router = express.Router();

const notificationTypeCtrl = require('../controllers/notificationType');
const reportReasonCtrl = require('../controllers/reportReason');
const contentTypeCtrl = require('../controllers/contentType');
const communityTypeCtrl = require('../controllers/communityType');
const communityFilterOptionCtrl = require('../controllers/communityFilterOption');

// ==================== NOTIFICATION TYPES ====================
router.get('/notification-types', notificationTypeCtrl.getAll);
router.get('/notification-types/:code', notificationTypeCtrl.getByCode);

// ==================== REPORT REASONS ====================
router.get('/report-reasons', reportReasonCtrl.getAll);
router.get('/report-reasons/:code', reportReasonCtrl.getByCode);

// ==================== CONTENT TYPES ====================
router.get('/content-types', contentTypeCtrl.getAll);
router.get('/content-types/:code', contentTypeCtrl.getByCode);
router.get('/community-types', communityTypeCtrl.getAll);
router.get('/community-types/:code', communityTypeCtrl.getByCode);

// Community Filter Options
router.get('/community-filter-options', communityFilterOptionCtrl.getAll);
router.get('/community-filter-options/:code', communityFilterOptionCtrl.getByCode);

module.exports = router;