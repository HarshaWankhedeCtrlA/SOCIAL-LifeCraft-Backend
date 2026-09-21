'use strict';

const getReportReasonModel = require('../models/master/ReportReason');

// GET all active report reasons
exports.getAll = async (req, res) => {
  try {
    const ReportReason = getReportReasonModel();
    const reasons = await ReportReason.find({ status: 'active' }).sort({ display_order: 1 });
    res.status(200).json({ success: true, data: reasons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single reason by code
exports.getByCode = async (req, res) => {
  try {
    const ReportReason = getReportReasonModel();
    const reason = await ReportReason.findOne({ code: req.params.code.toUpperCase() });
    if (!reason) {
      return res.status(404).json({ success: false, message: 'Report reason not found' });
    }
    res.status(200).json({ success: true, data: reason });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE report reason (admin)
exports.create = async (req, res) => {
  try {
    const ReportReason = getReportReasonModel();
    const reason = await ReportReason.create(req.body);
    res.status(201).json({ success: true, data: reason });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE report reason (admin)
exports.update = async (req, res) => {
  try {
    const ReportReason = getReportReasonModel();
    const reason = await ReportReason.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!reason) {
      return res.status(404).json({ success: false, message: 'Report reason not found' });
    }
    res.status(200).json({ success: true, data: reason });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE (soft) report reason (admin)
exports.delete= async (req, res) => {
  try {
    const ReportReason = getReportReasonModel();
    const reason = await ReportReason.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!reason) {
      return res.status(404).json({ success: false, message: 'Report reason not found' });
    }
    res.status(200).json({ success: true, message: 'Report reason deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};