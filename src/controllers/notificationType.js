'use strict';

const getNotificationTypeModel = require('../models/master/NotificationType');

// GET /api/v1/master/notification-types
exports.getAll= async (req, res) => {
  try {
    const NotificationType = getNotificationTypeModel();
    const types = await NotificationType.find({ status: 'active' });
    res.status(200).json({ success: true, count: types.length, data: types });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification types', error: err.message });
  }
};

// GET /api/v1/master/notification-types/:id
exports.getByCode  = async (req, res) => {
  try {
    const NotificationType = getNotificationTypeModel();
    const type = await NotificationType.findOne({ code: req.params.code.toUpperCase() });
    if (!type) {
      return res.status(404).json({ success: false, message: 'Notification type not found' });
    }
    res.status(200).json({ success: true, data: type });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification type', error: err.message });
  }
};