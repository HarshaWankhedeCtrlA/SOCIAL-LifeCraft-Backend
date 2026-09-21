'use strict';

const getCommunityFilterOptionModel = require('../models/master/CommunityFilterOption');

exports.getAll = async (req, res) => {
  try {
    const CommunityFilterOption = getCommunityFilterOptionModel();
    const data = await CommunityFilterOption.find({ status: 'active' }).sort({ filter_group: 1, display_order: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getByCode = async (req, res) => {
  try {
    const CommunityFilterOption = getCommunityFilterOptionModel();
    const data = await CommunityFilterOption.findOne({ code: req.params.code.toUpperCase() });
    if (!data) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};