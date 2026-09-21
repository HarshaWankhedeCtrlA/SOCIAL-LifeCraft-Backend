'use strict';

const getCommunityTypeModel = require('../models/master/CommunityType');

exports.getAll = async (req, res) => {
  try {
    const CommunityType = getCommunityTypeModel();
    const data = await CommunityType.find({ status: 'active' }).sort({ display_order: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getByCode = async (req, res) => {
  try {
    const CommunityType = getCommunityTypeModel();
    const data = await CommunityType.findOne({ code: req.params.code.toUpperCase() });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};