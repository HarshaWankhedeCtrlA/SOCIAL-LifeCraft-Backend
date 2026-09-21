'use strict';

const getContentTypeModel = require('../models/master/ContentType');

// GET all active content types
exports.getAll = async (req, res) => {
  try {
    const ContentType = getContentTypeModel();
    const types = await ContentType.find({ status: 'active' }).sort({ display_order: 1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single content type by code
exports.getByCode = async (req, res) => {
  try {
    const ContentType = getContentTypeModel();
    const type = await ContentType.findOne({ code: req.params.code.toUpperCase() });
    if (!type) {
      return res.status(404).json({ success: false, message: 'Content type not found' });
    }
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE content type (admin)
exports.create= async (req, res) => {
  try {
    const ContentType = getContentTypeModel();
    const type = await ContentType.create(req.body);
    res.status(201).json({ success: true, data: type });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE content type (admin)
exports.update = async (req, res) => {
  try {
    const ContentType = getContentTypeModel();
    const type = await ContentType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!type) {
      return res.status(404).json({ success: false, message: 'Content type not found' });
    }
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE (soft) content type (admin)
exports.delete = async (req, res) => {
  try {
    const ContentType = getContentTypeModel();
    const type = await ContentType.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!type) {
      return res.status(404).json({ success: false, message: 'Content type not found' });
    }
    res.status(200).json({ success: true, message: 'Content type deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};