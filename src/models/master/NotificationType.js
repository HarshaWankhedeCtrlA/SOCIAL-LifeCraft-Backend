'use strict';

const mongoose = require('mongoose');
const { getMasterDB } = require('../../config/db');

const notificationTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    default_channel: { type: String, enum: ['push', 'email', 'sms'], default: 'push' },
    category: { type: String, enum: ['transactional', 'marketing'], default: 'transactional' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, collection: 'notification_types' }
);

function getNotificationTypeModel() {
  const db = getMasterDB();
  return db.models.NotificationType || db.model('NotificationType', notificationTypeSchema);
}

module.exports = getNotificationTypeModel;