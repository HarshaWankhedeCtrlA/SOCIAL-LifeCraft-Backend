const { v4: uuidv4 } = require('uuid');
const { getUsersByIds } = require('../utils/authServiceClient');
const getPostModel = require('../models/Post');
const getCategoryModel = require('../models/master/Category');   // ✅ NEW

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

// ✅ NEW helper — validates category against master, returns { valid, validCategories }
async function validateCategory(category) {
  if (!category) return { valid: true };   // null/undefined is allowed

  const Category = getCategoryModel();
  const exists = await Category.findOne({
    code: String(category).toUpperCase(),
    status: 'active'
  }).lean();

  if (exists) return { valid: true };

  const all = await Category.find({ status: 'active' }).select('code -_id').lean();
  return { valid: false, validCategories: all.map(c => c.code) };
}

// Create Post
exports.createPost = async (req, res, next) => {
  try {
    const Post = getPostModel();
    const {
      communityId,
      title,
      content,
      contentType,
      visibility,
      tags,
      category,
      media,
      coverImage,
      metadata,
      isPinned,
      isAnnouncement
    } = req.body;
    const authorId = req.user.id;

    // ✅ Validate category against master
    const catCheck = await validateCategory(category);
    if (!catCheck.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category "${category}" is not valid`,
          validCategories: catCheck.validCategories
        }
      });
    }

    // Process tags
    let processedTags = tags || [];
    if (processedTags.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TAG_LIMIT_EXCEEDED',
          message: 'Maximum 10 tags allowed'
        }
      });
    }
    processedTags = processedTags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 30)
      .slice(0, 10);

    // Process media
    let processedMedia = media || [];
    if (!Array.isArray(processedMedia)) {
      processedMedia = [];
    }
    if (processedMedia.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MEDIA_LIMIT_EXCEEDED',
          message: 'Maximum 10 media files allowed'
        }
      });
    }

    const processedCoverImage = coverImage || null;

    const post = new Post({
      postId: uuidv4(),
      communityId,
      authorId,
      title: title || '',
      content,
      contentType: contentType || 'text',
      visibility: visibility || 'public',
      tags: processedTags,
      category: category ? String(category).toUpperCase() : null,   // ✅ normalize case
      media: processedMedia,
      coverImage: processedCoverImage,
      metadata: metadata || {},
      isPinned: isPinned || false,
      isAnnouncement: isAnnouncement || false,
      publishedAt: new Date()
    });

    await post.save();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// Get Posts
exports.getPosts = async (req, res, next) => {
  try {
    const Post = getPostModel();
    const {
      communityId,
      authorId,
      tag,
      category,
      contentType,
      status,
      search,
      page = 1,
      pageSize = 20,
      sort = 'newest'
    } = req.query;

    const query = { status: 'published' };
    if (communityId) query.communityId = communityId;
    if (authorId) query.authorId = authorId;
    if (tag) query.tags = { $in: [tag.toLowerCase()] };
    if (category) query.category = String(category).toUpperCase();   // ✅ normalize for consistent queries
    if (contentType) query.contentType = contentType;
    if (status) query.status = status;

    if (search) {
      query.$text = { $search: search };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { likeCount: -1, commentCount: -1 };
    if (sort === 'trending') sortOption = { viewCount: -1, likeCount: -1 };

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [posts, total] = await Promise.all([
      Post.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
      Post.countDocuments(query)
    ]);
    const items = await attachAuthors(posts);

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

// Get Single Post
exports.getPost = async (req, res, next) => {
  try {
    const Post = getPostModel();
    const { id } = req.params;
    const post = await Post.findOne({ postId: id });
    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    await Post.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } });
    const [postWithAuthor] = await attachAuthors([post.toObject()]);

    res.json({
      success: true,
      data: postWithAuthor
    });
  } catch (error) {
    next(error);
  }
};

// Update Post
exports.updatePost = async (req, res, next) => {
  try {
    const Post = getPostModel();
    const { id } = req.params;
    const {
      title, content, tags, category, visibility,
      isPinned, isAnnouncement, media, coverImage
    } = req.body;
    const userId = req.user.id;

    const post = await Post.findOne({ postId: id });
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: 'POST_NOT_FOUND', message: 'Post not found' }
      });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only the author can update this post'
        }
      });
    }

    // ✅ Validate category if being changed
    if (category !== undefined && category !== null) {
      const catCheck = await validateCategory(category);
      if (!catCheck.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Category "${category}" is not valid`,
            validCategories: catCheck.validCategories
          }
        });
      }
    }

    // ✅ BUG FIX: `updates` must be declared BEFORE any assignment
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (category !== undefined) {
      updates.category = category ? String(category).toUpperCase() : null;
    }
    if (visibility !== undefined) updates.visibility = visibility;
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (isAnnouncement !== undefined) updates.isAnnouncement = isAnnouncement;
    if (media !== undefined) updates.media = Array.isArray(media) ? media : [];
    if (coverImage !== undefined) updates.coverImage = coverImage;

    await Post.updateOne({ _id: post._id }, { $set: updates });
    const updatedPost = await Post.findOne({ postId: id });

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost
    });
  } catch (error) {
    next(error);
  }
};

// Delete Post
exports.deletePost = async (req, res, next) => {
  try {
    const Post = getPostModel();
    const { id } = req.params;
    const userId = req.user.id;

    const post = await Post.findOne({ postId: id });
    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only the author can delete this post'
        }
      });
    }

    await Post.deleteOne({ _id: post._id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};