const { getUsersByIds } = require('../utils/authServiceClient');
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

// ============================================
// INTERNAL HELPER — called from engagementController
// (like/comment/reply/share actions call this to fire a notification)
// ============================================
exports.createNotification = async ({ recipientId, actorId, type, targetType, targetId, postId, message, preview }) => {
  try {
    // Don't notify users about their own actions
    if (recipientId === actorId) return null;

    const notification = new Notification({
      notificationId: uuidv4(),
      recipientId,
      actorId,
      type,
      targetType,
      targetId,
      postId,
      message,
      preview: preview || ''
    });

    await notification.save();
    return notification;
  } catch (err) {
    // Never let a notification failure break the main action (like/comment/etc.)
    console.error('Failed to create notification:', err.message);
    return null;
  }
};

// ============================================
// GET MY NOTIFICATIONS
// ============================================
exports.getMyNotifications = async (req, res, next) => {
  try {
    const recipientId = req.user.id;
    const { type, isRead, page = 1, pageSize = 20 } = req.query;

    const query = { recipientId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId, isRead: false })
    ]);

    // ✅ NEW: batch fetch actor names from auth-service in ONE call
    const actorIds = notifications.map(n => n.actorId);
    const actorsMap = await getUsersByIds(actorIds);

    const enrichedNotifications = notifications.map(n => ({
      ...n,
      actor: actorsMap[n.actorId]
        ? {
            firstName: actorsMap[n.actorId].firstName,
            lastName: actorsMap[n.actorId].lastName,
            fullName: actorsMap[n.actorId].fullName,
            avatar: actorsMap[n.actorId].avatar
          }
        : null
    }));

    res.json({
      success: true,
      data: {
        items: enrichedNotifications,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        unreadCount
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================================
// GET UNREAD COUNT (for badge icon)
// ============================================
exports.getUnreadCount = async (req, res, next) => {
  try {
    const recipientId = req.user.id;
    const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });

    res.json({ success: true, data: { unreadCount } });

  } catch (error) {
    next(error);
  }
};

// ============================================
// MARK ONE NOTIFICATION AS READ
// ============================================
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipientId = req.user.id;

    const notification = await Notification.findOne({ notificationId: id });
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' }
      });
    }

    if (notification.recipientId !== recipientId) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'This notification does not belong to you' }
      });
    }

    await Notification.updateOne(
      { _id: notification._id },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error) {
    next(error);
  }
};

// ============================================
// MARK ALL AS READ
// ============================================
exports.markAllAsRead = async (req, res, next) => {
  try {
    const recipientId = req.user.id;

    await Notification.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });

  } catch (error) {
    next(error);
  }
};

// ============================================
// DELETE A NOTIFICATION
// ============================================
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipientId = req.user.id;

    const notification = await Notification.findOne({ notificationId: id });
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' }
      });
    }

    if (notification.recipientId !== recipientId) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'This notification does not belong to you' }
      });
    }

    await Notification.deleteOne({ _id: notification._id });

    res.status(204).send();

  } catch (error) {
    next(error);
  }
};