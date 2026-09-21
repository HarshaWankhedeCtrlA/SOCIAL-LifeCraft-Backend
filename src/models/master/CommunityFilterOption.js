'use strict';

const mongoose = require('mongoose');
const { getMasterDB } = require('../../config/db');

const communityFilterOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    filter_group: {
      type: String,
      required: true,
      enum: ['mode', 'pricing', 'level', 'language', 'activity', 'size', 'sort'],
    },
    description: { type: String, default: '' },
    display_order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

communityFilterOptionSchema.index({ filter_group: 1, code: 1 }, { unique: true });

let CommunityFilterOption;

function getCommunityFilterOptionModel() {
  if (!CommunityFilterOption) {
    const conn = getMasterDB();
    CommunityFilterOption = conn.model('CommunityFilterOption', communityFilterOptionSchema);
  }
  return CommunityFilterOption;
}

module.exports = getCommunityFilterOptionModel;