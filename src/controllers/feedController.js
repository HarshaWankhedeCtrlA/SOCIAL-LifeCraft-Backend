const { getUsersByIds } = require('../utils/authServiceClient');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Bookmark = require('../models/Bookmark');
const Follow = require('../models/Follow');
const UserInterest = require('../models/UserInterest');

// ============================================
// HELPER: derive user's top interest tags on the fly
// ============================================
async function deriveInterestTags(userId, limit = 10) {
  const [likedPostIds, commentedPostIds, savedPostIds] = await Promise.all([
    Like.find({ userId, targetType: 'post' }).distinct('targetId'),
    Comment.find({ authorId: userId }).distinct('postId'),
    Bookmark.find({ userId }).distinct('postId')
  ]);

  const engagedPostIds = [...new Set([...likedPostIds, ...commentedPostIds, ...savedPostIds])];
  if (engagedPostIds.length === 0) return [];

  const posts = await Post.find({ postId: { $in: engagedPostIds } }, { tags: 1, category: 1 }).lean();

  const tagCount = {};
  posts.forEach(p => {
    (p.tags || []).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
    if (p.category) {
      tagCount[p.category] = (tagCount[p.category] || 0) + 1;
    }
  });

  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

// ============================================
// HELPER: attach author info to a list of posts
// ============================================
async function attachAuthors(posts) {
  const authorIds = posts.map(p => p.authorId);
  const authorsMap = await getUsersByIds(authorIds);

  return posts.map(post => ({
    ...post,
    author: authorsMap[post.authorId]
      ? {
          firstName: authorsMap[post.authorId].firstName,
          lastName: authorsMap[post.authorId].lastName,
          fullName: authorsMap[post.authorId].fullName,
          avatar: authorsMap[post.authorId].avatar
        }
      : null
  }));
}

// ============================================
// GET PERSONALIZED FEED
// ============================================
exports.getPersonalizedFeed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let interestTags = [];
    const cached = await UserInterest.findOne({ userId }).lean();
    if (cached && cached.tagScores) {
      interestTags = Object.entries(cached.tagScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);
    } else {
      interestTags = await deriveInterestTags(userId);
    }

    const followingIds = await Follow.find({ followerId: userId }).distinct('followingId');

    const candidates = await Post.find({
      status: 'published',
      visibility: { $in: ['public', 'members_only'] }
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const now = Date.now();
    const scored = candidates.map(post => {
      let score = 0;

      score += (post.likeCount || 0) * 2;
      score += (post.commentCount || 0) * 3;
      score += (post.shareCount || 0) * 4;
      score += (post.saveCount || 0) * 2;
      score += (post.viewCount || 0) * 0.1;

      const postTags = [...(post.tags || []), post.category].filter(Boolean);
      const matchCount = postTags.filter(t => interestTags.includes(t)).length;
      score += matchCount * 15;

      const ageInHours = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 50 - ageInHours / 4);
      score += recencyScore;

      if (post.isPinned) score += 20;
      if (post.isAnnouncement) score += 15;
      if (followingIds.includes(post.authorId)) score += 25;

      return { ...post, feedScore: Math.round(score * 100) / 100 };
    });

    scored.sort((a, b) => b.feedScore - a.feedScore);
    const total = scored.length;
    const pageItems = scored.slice(skip, skip + limit);

    // ✅ enrich just this page's posts with author info
    const items = await attachAuthors(pageItems);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        basedOnInterests: interestTags
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET FOLLOWING-ONLY FEED (chronological)
// ============================================
exports.getFollowingFeed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const followingIds = await Follow.find({ followerId: userId }).distinct('followingId');

    if (followingIds.length === 0) {
      return res.json({
        success: true,
        data: { items: [], total: 0, page: parseInt(page), pageSize: limit, totalPages: 0 }
      });
    }

    const query = {
      status: 'published',
      visibility: { $in: ['public', 'members_only'] },
      authorId: { $in: followingIds }
    };

    const [pageItems, total] = await Promise.all([
      Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Post.countDocuments(query)
    ]);

    // ✅ enrich with author info
    const items = await attachAuthors(pageItems);

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// RECORD INTEREST (called from other controllers)
// ============================================
exports.recordInterest = async (userId, postId) => {
  try {
    const post = await Post.findOne({ postId }, { tags: 1, category: 1 }).lean();
    if (!post) return;

    const tags = [...(post.tags || []), post.category].filter(Boolean);
    if (tags.length === 0) return;

    let userInterest = await UserInterest.findOne({ userId });
    if (!userInterest) {
      userInterest = new UserInterest({ userId, tagScores: {} });
    }

    tags.forEach(tag => {
      const current = userInterest.tagScores.get(tag) || 0;
      userInterest.tagScores.set(tag, current + 1);
    });

    userInterest.updatedAt = new Date();
    await userInterest.save();
  } catch (err) {
    console.error('Failed to record interest:', err.message);
  }
};