'use strict';

const mongoose = require('mongoose');
const { getMasterDB } = require('../../config/db');

const reportReasonSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true, // SPAM, HARASSMENT, NUDITY, etc.
    },
    name: {
      type: String,
      required: true, // "Spam", "Harassment or Bullying"
    },
    description: {
      type: String,
      default: '',
    },
    applies_to: {
      type: [String], // ["post", "comment", "user", "community"]
      default: ['post', 'comment'],
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
  { timestamps: true }
);

let ReportReason;

function getReportReasonModel() {
  if (!ReportReason) {
    const conn = getMasterDB();
    ReportReason = conn.model('ReportReason', reportReasonSchema);
  }
  return ReportReason;
}

module.exports = getReportReasonModel;