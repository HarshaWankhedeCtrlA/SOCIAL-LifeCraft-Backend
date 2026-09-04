const { v4: uuidv4 } = require('uuid');
const Bookmark = require('../models/Bookmark');
const Post = require('../models/Post');

// ============================================
// TOGGLE BOOKMARK (save / unsave)
// ============================================
exports.toggleBookmark = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { postId, collectionName } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: { code: 'POST_ID_REQUIRED', message: 'postId is required' }
      });
    }

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: 'POST_NOT_FOUND', message: 'Post not found' }
      });
    }

    const existing = await Bookmark.findOne({ userId, postId });

    if (existing) {
      // Unsave
      await Bookmark.deleteOne({ _id: existing._id });
      await Post.updateOne({ postId }, { $inc: { saveCount: -1 } });

      return res.json({
        success: true,
        message: 'Bookmark removed',
        data: { bookmarked: false }
      });
    }

    // Save
    const bookmark = new Bookmark({
      bookmarkId: uuidv4(),
      userId,
      postId,
      collectionName: collectionName || 'default'
    });

    await bookmark.save();
    await Post.updateOne({ postId }, { $inc: { saveCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Post bookmarked',
      data: { bookmarked: true, bookmark }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_BOOKMARKED', message: 'Post already bookmarked' }
      });
    }
    next(error);
  }
};

// ============================================
// GET USER'S BOOKMARKS (saved posts)
// ============================================
exports.getUserBookmarks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { collectionName, page = 1, pageSize = 20 } = req.query;

    const query = { userId };
    if (collectionName) query.collectionName = collectionName;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bookmark.countDocuments(query)
    ]);

    // Fetch the actual posts for these bookmarks
    const postIds = bookmarks.map(b => b.postId);
    const posts = await Post.find({ postId: { $in: postIds } }).lean();
    const postMap = posts.reduce((acc, p) => {
      acc[p.postId] = p;
      return acc;
    }, {});

    const items = bookmarks.map(b => ({
      ...b,
      post: postMap[b.postId] || null
    }));

    res.json({
      success: true,
      data: {
        items,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// CHECK IF A POST IS BOOKMARKED BY CURRENT USER
// ============================================
exports.checkBookmark = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const bookmark = await Bookmark.findOne({ userId, postId });

    res.json({
      success: true,
      data: { bookmarked: !!bookmark, bookmark: bookmark || null }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// REMOVE BOOKMARK BY ID
// ============================================
exports.deleteBookmark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const bookmark = await Bookmark.findOne({ bookmarkId: id });
    if (!bookmark) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKMARK_NOT_FOUND', message: 'Bookmark not found' }
      });
    }

    if (bookmark.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'You do not own this bookmark' }
      });
    }

    await Bookmark.deleteOne({ _id: bookmark._id });
    await Post.updateOne({ postId: bookmark.postId }, { $inc: { saveCount: -1 } });

    res.status(204).send();

  } catch (error) {
    next(error);
  }
};