'use strict';

const mongoose = require('mongoose');
const { getMasterDB } = require('../../config/db');

const categorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    icon_url: {
      type: String,
      default: '',
    },
    parent_category_id: {
      type: String,
      default: null,
    },
    display_order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true, collection: 'categories' }
);

let Category;

function getCategoryModel() {
  if (!Category) {
    const conn = getMasterDB();
    Category = conn.model('Category', categorySchema);
  }
  return Category;
}

module.exports = getCategoryModel;