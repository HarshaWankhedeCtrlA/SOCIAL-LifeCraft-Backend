const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');

const REPORT_REASONS = Object.freeze([
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity_sexual_content',
  'misinformation',
  'self_harm',
  'intellectual_property',
  'impersonation',
  'other'
]);

const ReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true, index: true },

  reporterId: { type: String, required: true, index: true }, // who filed the report

  // Polymorphic target - post or comment (extensible later)
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: String, required: true, index: true },

  // Denormalized for fast moderator lookups without extra joins
  postId: { type: String, required: true, index: true },
  targetAuthorId: { type: String, required: true, index: true }, // who owns the reported content

  reason: {
    type: String,
    enum: REPORT_REASONS,
    required: true
  },
  description: { type: String, maxlength: 1000, trim: true },

  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  // Moderation trail
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  moderatorNotes: { type: String, maxlength: 1000, default: null },
  actionTaken: {
    type: String,
    enum: ['none', 'content_removed', 'content_hidden', 'user_warned', 'user_suspended'],
    default: 'none'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Prevent the same user from spamming reports on the same content
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
let Report;

function getReportModel() {
  if (!Report) {
    const conn = getSocialDB();
    Report = conn.model('Report', ReportSchema);
  }
  return Report;
}

module.exports = getReportModel;
module.exports.REPORT_REASONS = REPORT_REASONS;