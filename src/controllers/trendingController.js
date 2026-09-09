const Post = require('../models/Post');
const { getUsersByIds } = require('../utils/authServiceClient');
async function attachAuthors(posts) {
  if (!posts || posts.length === 0) return posts;
  
  const authorIds = posts.map(p => p.authorId).filter(Boolean);
  const authorsMap = await getUsersByIds(authorIds);
  
  return posts.map(post => ({
    ...post,
    author: authorsMap[post.authorId]
      ? {
          id: authorsMap[post.authorId].id,
          firstName: authorsMap[post.authorId].firstName,
          lastName: authorsMap[post.authorId].lastName,
          fullName: authorsMap[post.authorId].fullName,
          avatar: authorsMap[post.authorId].avatar
        }
      : null
  }));
}

// ============================================
// GET TRENDING POSTS
// Trending = high engagement velocity within a recent time window,
// not just total lifetime likes/comments (that would just favor old posts).
// ============================================
exports.getTrendingPosts = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, window = '7d' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // Map window param to hours
    const windowHoursMap = { '24h': 24, '7d': 168, '30d': 720 };
    const windowHours = windowHoursMap[window] || 168; // default 7 days

    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    // Only consider posts published within the trending window
    const candidates = await Post.find({
      status: 'published',
      visibility: { $in: ['public', 'members_only'] },
      publishedAt: { $gte: windowStart }
    })
      .sort({ publishedAt: -1 })
      .limit(500) // candidate pool
      .lean();

    const now = Date.now();

    const scored = candidates.map(post => {
      // Engagement velocity score — weighted by action "cost" to produce
      // (a share/comment shows more intent than a passive like)
      const engagementScore =
        (post.likeCount || 0) * 1 +
        (post.commentCount || 0) * 3 +
        (post.shareCount || 0) * 5 +
        (post.saveCount || 0) * 2 +
        (post.viewCount || 0) * 0.05;

      // Age decay — newer posts with the same engagement rank higher
      // (classic "hot" ranking, similar to Reddit/HackerNews style decay)
      const ageInHours = Math.max(1, (now - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60));
      const trendingScore = engagementScore / Math.pow(ageInHours + 2, 1.5);

      return { ...post, trendingScore: Math.round(trendingScore * 10000) / 10000 };
    });

    // Filter out posts with zero engagement (nothing to "trend")
    const withEngagement = scored.filter(p => p.trendingScore > 0);

    withEngagement.sort((a, b) => b.trendingScore - a.trendingScore);

    const total = withEngagement.length;
    const pageItems = withEngagement.slice(skip, skip + limit);
    const items = await attachAuthors(pageItems);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        window
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET TRENDING TAGS/HASHTAGS
// (bonus — useful for a "Trending topics" chip list in UI)
// ============================================
exports.getTrendingTags = async (req, res, next) => {
  try {
    const { window = '7d', limit = 10 } = req.query;

    const windowHoursMap = { '24h': 24, '7d': 168, '30d': 720 };
    const windowHours = windowHoursMap[window] || 168;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const posts = await Post.find(
      {
        status: 'published',
        publishedAt: { $gte: windowStart }
      },
      { tags: 1, hashtags: 1, likeCount: 1, commentCount: 1, shareCount: 1 }
    ).lean();

    const tagScores = {};

    posts.forEach(post => {
      const engagementWeight =
        (post.likeCount || 0) + (post.commentCount || 0) * 2 + (post.shareCount || 0) * 3 + 1; // +1 so every post counts at least a little

      const allTags = [...(post.tags || []), ...(post.hashtags || []).map(h => h.replace('#', ''))];
      const uniqueTags = [...new Set(allTags)];

      uniqueTags.forEach(tag => {
        tagScores[tag] = (tagScores[tag] || 0) + engagementWeight;
      });
    });

    const trendingTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(limit))
      .map(([tag, score]) => ({ tag, score }));

    res.json({
      success: true,
      data: { items: trendingTags, window }
    });

  } catch (error) {
    next(error);
  }
};