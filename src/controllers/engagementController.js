const { v4: uuidv4 } = require('uuid');
const { getUsersByIds } = require('../utils/authServiceClient');
const getLikeModel = require('../models/Like');
const getCommentModel  = require('../models/Comment');
const getShareModel = require('../models/Share');
const getPostModel  = require('../models/Post');
const { createNotification } = require('./notificationController'); // ✅ NEW


async function attachActors(items, userIdField = 'userId') {
  if (!items || items.length === 0) return items;
  
  const userIds = items.map(item => item[userIdField]).filter(Boolean);
  const usersMap = await getUsersByIds(userIds);
  
  return items.map(item => ({
    ...item,
    actor: usersMap[item[userIdField]]
      ? {
          firstName: usersMap[item[userIdField]].firstName,
          lastName: usersMap[item[userIdField]].lastName,
          fullName: usersMap[item[userIdField]].fullName,
          avatar: usersMap[item[userIdField]].avatar
        }
      : null
  }));
}

// ============================================
// LIKE / UNLIKE
// ============================================
exports.toggleLike = async (req, res, next) => {
  try {
    const Like = getLikeModel();         
    const Post = getPostModel();          
    const Comment = getCommentModel();
    const userId = req.user.id;
    const { targetType, targetId, postId } = req.body;

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TARGET_TYPE', message: 'targetType must be post or comment' }
      });
    }

    const existing = await Like.findOne({ userId, targetType, targetId });

    if (existing) {
      // Unlike
      await Like.deleteOne({ _id: existing._id });

      if (targetType === 'post') {
        await Post.updateOne({ postId: targetId }, { $inc: { likeCount: -1 } });
      } else {
        await Comment.updateOne({ commentId: targetId }, { $inc: { likeCount: -1 } });
      }

      return res.json({ success: true, message: 'Unliked', data: { liked: false } });
    }

    // Like
    const like = new Like({ likeId: uuidv4(), userId, targetType, targetId, postId });
    await like.save();

    if (targetType === 'post') {
      await Post.updateOne({ postId: targetId }, { $inc: { likeCount: 1 } });

      // ✅ NEW: notify the post author (unless they liked their own post)
      const post = await Post.findOne({ postId: targetId });
      if (post) {
        createNotification({
          recipientId: post.authorId,
          actorId: userId,
          type: 'like',
          targetType: 'post',
          targetId,
          postId: targetId,
          message: 'liked your post',
          preview: post.title || (post.content ? post.content.slice(0, 60) : '')
        });
      }
    } else {
      await Comment.updateOne({ commentId: targetId }, { $inc: { likeCount: 1 } });

      // ✅ NEW: notify the comment author
      const comment = await Comment.findOne({ commentId: targetId });
      if (comment) {
        createNotification({
          recipientId: comment.authorId,
          actorId: userId,
          type: 'like',
          targetType: 'comment',
          targetId,
          postId: comment.postId,
          message: 'liked your comment',
          preview: comment.content ? comment.content.slice(0, 60) : ''
        });
      }
    }

    res.status(201).json({ success: true, message: 'Liked', data: { liked: true, like } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_LIKED', message: 'Already liked' } });
    }
    next(error);
  }
};

// Get likes for a target (who liked it)
exports.getLikes = async (req, res, next) => {
  try {
        const Like = getLikeModel();          
    const { targetType, targetId } = req.query;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [likes, total] = await Promise.all([
      Like.find({ targetType, targetId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize)).lean(),
      Like.countDocuments({ targetType, targetId })
    ]);
    const items = await attachActors(likes, 'userId');

    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (error) {
    next(error);
  }
};

// ============================================
// COMMENTS & REPLIES
// ============================================
exports.createComment = async (req, res, next) => {
  try {
     const Comment = getCommentModel();    
    const Post = getPostModel();  
    const authorId = req.user.id;
    const { postId, content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Comment content is required' } });
    }

    let rootCommentId = null;

    if (parentCommentId) {
      const parent = await Comment.findOne({ commentId: parentCommentId });
      if (!parent) {
        return res.status(404).json({ success: false, error: { code: 'PARENT_NOT_FOUND', message: 'Parent comment not found' } });
      }
      // Flatten thread: reply always points its root to the top-level comment
      rootCommentId = parent.rootCommentId || parent.commentId;
    }

    const mentionRegex = /@[\w\u00c0-\u024f]+/g;
    const mentions = [...new Set((content.match(mentionRegex) || []).map(m => m.toLowerCase()))];

    const comment = new Comment({
      commentId: uuidv4(),
      postId,
      authorId,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
      rootCommentId,
      mentions
    });

    await comment.save();

    // Update counters
    await Post.updateOne({ postId }, { $inc: { commentCount: 1 } });
    if (parentCommentId) {
      await Comment.updateOne({ commentId: parentCommentId }, { $inc: { replyCount: 1 } });
    }

    // ✅ NEW: fire notification
    const post = await Post.findOne({ postId });

    if (parentCommentId) {
      // This is a REPLY — notify the parent comment's author
      const parentComment = await Comment.findOne({ commentId: parentCommentId });
      if (parentComment) {
        createNotification({
          recipientId: parentComment.authorId,
          actorId: authorId,
          type: 'reply',
          targetType: 'comment',
          targetId: comment.commentId,
          postId,
          message: 'replied to your comment',
          preview: content.slice(0, 60)
        });
      }
    } else if (post) {
      // This is a top-level COMMENT — notify the post author
      createNotification({
        recipientId: post.authorId,
        actorId: authorId,
        type: 'comment',
        targetType: 'post',
        targetId: comment.commentId,
        postId,
        message: 'commented on your post',
        preview: content.slice(0, 60)
      });
    }

    res.status(201).json({ success: true, message: 'Comment added', data: comment });
  } catch (error) {
    next(error);
  }
};

// Get top-level comments for a post
exports.getComments = async (req, res, next) => {
  try {
    const Comment = getCommentModel();
    const { postId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [comments, total] = await Promise.all([
      Comment.find({ postId, parentCommentId: null, status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      Comment.countDocuments({ postId, parentCommentId: null, status: 'active' })
    ]);
 const items = await attachActors(comments, 'authorId');
    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (error) {
    next(error);
  }
};

// Get replies for a specific comment (nested thread)
exports.getReplies = async (req, res, next) => {
  try {
    const Comment = getCommentModel();  
    const { commentId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [replies, total] = await Promise.all([
      Comment.find({ parentCommentId: commentId, status: 'active' })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(pageSize))
        .lean(),
      Comment.countDocuments({ parentCommentId: commentId, status: 'active' })
    ]);
 const items = await attachActors(replies, 'authorId');
    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (error) {
    next(error);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const Comment = getCommentModel();
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findOne({ commentId: id });
    if (!comment) {
      return res.status(404).json({ success: false, error: { code: 'COMMENT_NOT_FOUND', message: 'Comment not found' } });
    }
    if (comment.authorId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only the author can edit this comment' } });
    }

    await Comment.updateOne({ _id: comment._id }, { $set: { content, isEdited: true } });
    const updated = await Comment.findOne({ commentId: id });

    res.json({ success: true, message: 'Comment updated', data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
     const Comment = getCommentModel();    
    const Post = getPostModel();  
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOne({ commentId: id });
    if (!comment) {
      return res.status(404).json({ success: false, error: { code: 'COMMENT_NOT_FOUND', message: 'Comment not found' } });
    }
    if (comment.authorId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: 'Only the author can delete this comment' } });
    }

    // Soft delete keeps thread structure intact for existing replies
    await Comment.updateOne({ _id: comment._id }, { $set: { status: 'deleted', content: '[deleted]' } });
    await Post.updateOne({ postId: comment.postId }, { $inc: { commentCount: -1 } });

    if (comment.parentCommentId) {
      await Comment.updateOne({ commentId: comment.parentCommentId }, { $inc: { replyCount: -1 } });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ============================================
// SHARE
// ============================================
exports.sharePost = async (req, res, next) => {
  try {
    const Share = getShareModel();        
    const Post = getPostModel();  
    const userId = req.user.id;
    const { postId, shareType, targetCommunityId, message, platform } = req.body;

    const post = await Post.findOne({ postId });
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'POST_NOT_FOUND', message: 'Post not found' } });
    }

    if (!['internal', 'external'].includes(shareType)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SHARE_TYPE', message: 'shareType must be internal or external' } });
    }

    const share = new Share({
      shareId: uuidv4(),
      userId,
      postId,
      shareType,
      targetCommunityId: targetCommunityId || null,
      message: message || '',
      platform: platform || null
    });

    await share.save();
    await Post.updateOne({ postId }, { $inc: { shareCount: 1 } });

    // ✅ NEW: notify the post author
    createNotification({
      recipientId: post.authorId,
      actorId: userId,
      type: 'share',
      targetType: 'post',
      targetId: postId,
      postId,
      message: 'shared your post',
      preview: post.title || (post.content ? post.content.slice(0, 60) : '')
    });

    res.status(201).json({ success: true, message: 'Post shared', data: share });
  } catch (error) {
    next(error);
  }
};

exports.getShares = async (req, res, next) => {
  try {
    const Share = getShareModel(); 
    const { postId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [shares, total] = await Promise.all([
      Share.find({ postId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(pageSize)).lean(),
      Share.countDocuments({ postId })
    ]);
const items = await attachActors(shares, 'userId');
    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (error) {
    next(error);
  }
};