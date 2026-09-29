'use strict';

const getCategoryModel = require('../models/master/Category');

// GET all active categories
exports.getAll = async (req, res) => {
  try {
    const Category = getCategoryModel();
    const categories = await Category.find({ status: 'active' }).sort({ display_order: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single category by code
exports.getByCode = async (req, res) => {
  try {
    const Category = getCategoryModel();
    const category = await Category.findOne({ code: req.params.code.toUpperCase() });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE category (admin)
exports.create = async (req, res) => {
  try {
    const Category = getCategoryModel();
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE category (admin)
exports.update = async (req, res) => {
  try {
    const Category = getCategoryModel();
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE (soft) category (admin)
exports.delete = async (req, res) => {
  try {
    const Category = getCategoryModel();
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};