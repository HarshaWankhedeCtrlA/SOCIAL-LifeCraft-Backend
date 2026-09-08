const express = require('express');
const router = express.Router();
const trendingController = require('../controllers/trendingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/posts', trendingController.getTrendingPosts);   // ?window=24h|7d|30d
router.get('/tags', trendingController.getTrendingTags);     // trending hashtags/topics

module.exports = router;