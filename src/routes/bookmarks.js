const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', bookmarkController.toggleBookmark);           // save/unsave (body: postId, collectionName)
router.get('/', bookmarkController.getUserBookmarks);          // get all saved posts (?collectionName=)
router.get('/check/:postId', bookmarkController.checkBookmark); // is this post saved by me?
router.delete('/:id', bookmarkController.deleteBookmark);       // remove by bookmarkId

module.exports = router;