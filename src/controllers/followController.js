const { getUsersByIds } = require('../utils/authServiceClient');
const { v4: uuidv4 } = require('uuid');
const getFollowModel = require('../models/Follow');


async function attachUserInfo(items, userIdField) {
  if (!items || items.length === 0) return items;
  
  const userIds = items.map(item => item[userIdField]).filter(Boolean);
  const usersMap = await getUsersByIds(userIds);
  
  return items.map(item => ({
    ...item,
    user: usersMap[item[userIdField]]
      ? {
          id: usersMap[item[userIdField]].id,
          firstName: usersMap[item[userIdField]].firstName,
          lastName: usersMap[item[userIdField]].lastName,
          fullName: usersMap[item[userIdField]].fullName,
          avatar: usersMap[item[userIdField]].avatar
        }
      : null
  }));
}

async function attachFollowStatus(items, currentUserId, userIdField) {
  if (!items || items.length === 0 || !currentUserId) return items;
   const Follow = getFollowModel();
  const userIds = items.map(item => item[userIdField]).filter(Boolean);
  const follows = await Follow.find({
    followerId: currentUserId,
    followingId: { $in: userIds }
  }).lean();
  
  const followingSet = new Set(follows.map(f => f.followingId));
  
  return items.map(item => ({
    ...item,
    isFollowedByCurrentUser: followingSet.has(item[userIdField])
  }));
}


// ============================================
// TOGGLE FOLLOW (follow / unfollow)
// ============================================
exports.toggleFollow = async (req, res, next) => {
  try {
    const Follow = getFollowModel(); 
    const followerId = req.user.id;
    const { followingId, targetType } = req.body;

    if (!followingId) {
      return res.status(400).json({
        success: false,
        error: { code: 'FOLLOWING_ID_REQUIRED', message: 'followingId is required' }
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_FOLLOW_SELF', message: 'You cannot follow yourself' }
      });
    }

    const existing = await Follow.findOne({ followerId, followingId });

    if (existing) {
      // Unfollow
      await Follow.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        message: 'Unfollowed',
        data: { following: false }
      });
    }

    // Follow
    const follow = new Follow({
      followId: uuidv4(),
      followerId,
      followingId,
      targetType: targetType || 'user'
    });

    await follow.save();

    res.status(201).json({
      success: true,
      message: 'Followed',
      data: { following: true, follow }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_FOLLOWING', message: 'Already following this user' }
      });
    }
    next(error);
  }
};

// ============================================
// GET FOLLOWERS (who follows a given user)
// ============================================
exports.getFollowers = async (req, res, next) => {
  try {
    const Follow = getFollowModel(); 
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [followers, total] = await Promise.all([
      Follow.find({ followingId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ followingId: userId })
    ]);
  let items = await attachUserInfo(followers, 'followerId');
    
    items = await attachFollowStatus(items, currentUserId, 'followerId');

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET FOLLOWING (who a given user follows)
// ============================================
exports.getFollowing = async (req, res, next) => {
  try {
    const Follow = getFollowModel(); 
    const { userId } = req.params;
     const currentUserId = req.user.id; 
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [following, total] = await Promise.all([
      Follow.find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments({ followerId: userId })
    ]);
    let items = await attachUserInfo(following, 'followingId');
    
    items = await attachFollowStatus(items, currentUserId, 'followingId');

    res.json({
      success: true,
      data: { items, total, page: parseInt(page), pageSize: limit, totalPages: Math.ceil(total / limit) }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// CHECK IF CURRENT USER FOLLOWS SOMEONE
// ============================================
exports.checkFollow = async (req, res, next) => {
  try {
    const Follow = getFollowModel(); 
    const followerId = req.user.id;
    const { followingId } = req.params;

    const follow = await Follow.findOne({ followerId, followingId });

    res.json({
      success: true,
      data: { following: !!follow }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET FOLLOW COUNTS (followers + following) for a user
// ============================================
exports.getFollowCounts = async (req, res, next) => {
  try {
    const Follow = getFollowModel(); 
    const { userId } = req.params;

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId })
    ]);

    res.json({
      success: true,
      data: { followersCount, followingCount }
    });

  } catch (error) {
    next(error);
  }
};