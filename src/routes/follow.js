const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', followController.toggleFollow);                    // follow/unfollow (body: followingId, targetType)
router.get('/followers/:userId', followController.getFollowers);    // who follows this user
router.get('/following/:userId', followController.getFollowing);    // who this user follows
router.get('/check/:followingId', followController.checkFollow);    // do I follow this user?
router.get('/counts/:userId', followController.getFollowCounts);    // follower/following counts

module.exports = router;