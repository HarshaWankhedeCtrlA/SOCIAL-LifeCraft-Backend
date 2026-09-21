const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');
const NotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true, index: true },

  // Who receives this notification
  recipientId: { type: String, required: true, index: true },

  // Who triggered it (the actor)
  actorId: { type: String, required: true },

  // What kind of engagement triggered it
  type: {
    type: String,
    enum: ['like', 'comment', 'reply', 'share', 'follow', 'mention'],
    required: true,
    index: true
  },

  // What content it relates to
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: String, required: true },
  postId: { type: String, required: true }, // always denormalized for quick "go to post" navigation

  // Human-readable preview so the client doesn't need extra lookups for the notification list
  message: { type: String, required: true }, // e.g. "Pranali liked your post"
  preview: { type: String, default: '' },     // e.g. snippet of the comment/post content

  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });
let Notification;

function getNotificationModel() {
  if (!Notification) {
    const conn = getSocialDB();
    Notification = conn.model('Notification', NotificationSchema);
  }
  return Notification;
}

module.exports = getNotificationModel;