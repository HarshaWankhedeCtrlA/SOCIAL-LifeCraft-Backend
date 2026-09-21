'use strict';

const mongoose = require('mongoose');
const { getMasterDB } = require('../../config/db');

const communityTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon_url: { type: String, default: '' },
    display_order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

let CommunityType;

function getCommunityTypeModel() {
  if (!CommunityType) {
    const conn = getMasterDB();
    CommunityType = conn.model('CommunityType', communityTypeSchema);
  }
  return CommunityType;
}

module.exports = getCommunityTypeModel;