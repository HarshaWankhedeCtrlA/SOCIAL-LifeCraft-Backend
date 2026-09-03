const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');

// Create Post
exports.createPost = async (req, res, next) => {
  try {
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

    // ✅ Process media (structured array from upload)
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

    // ✅ Process coverImage
    let processedCoverImage = coverImage || null;

    // Create post
    const post = new Post({
      postId: uuidv4(),
      communityId,
      authorId,
      title: title || '',
      content,
      contentType: contentType || 'text',
      visibility: visibility || 'public',
      tags: processedTags,
      category: category || null,
     media: processedMedia,  
      coverImage: coverImage || null,
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
    if (category) query.category = category;
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
      Post.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        items: posts,
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

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// Update Post
exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, tags, category, visibility, isPinned, isAnnouncement , media,
    coverImage    } = req.body;
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
 if (media !== undefined) {
    updates.media = Array.isArray(media) ? media : [];
  }
  if (coverImage !== undefined) {
    updates.coverImage = coverImage;
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

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (category !== undefined) updates.category = category;
    if (visibility !== undefined) updates.visibility = visibility;
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (isAnnouncement !== undefined) updates.isAnnouncement = isAnnouncement;

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
    const { id } = req.params;
    const userId = req.user.id;

    // Find the post
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

    // Check if user is the author
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