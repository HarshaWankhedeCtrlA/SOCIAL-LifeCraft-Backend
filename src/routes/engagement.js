const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Likes
router.post('/likes', engagementController.toggleLike);        // like/unlike (body: targetType, targetId, postId)
router.get('/likes', engagementController.getLikes);           // ?targetType=&targetId=

// Comments & Replies (a reply = comment with parentCommentId)
router.post('/comments', engagementController.createComment);
router.get('/comments/post/:postId', engagementController.getComments);
router.get('/comments/:commentId/replies', engagementController.getReplies);
router.put('/comments/:id', engagementController.updateComment);
router.delete('/comments/:id', engagementController.deleteComment);

// Shares
router.post('/shares', engagementController.sharePost);
router.get('/shares/post/:postId', engagementController.getShares);

module.exports = router;