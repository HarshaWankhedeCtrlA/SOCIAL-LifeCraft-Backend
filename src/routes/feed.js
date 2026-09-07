const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', feedController.getPersonalizedFeed);
router.get('/following', feedController.getFollowingFeed);

module.exports = router;