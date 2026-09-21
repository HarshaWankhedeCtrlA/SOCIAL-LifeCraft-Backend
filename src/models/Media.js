'use strict'; 
const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');

const MediaSchema = new mongoose.Schema({
  // ✅ Core identifiers
  mediaId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // ✅ File information
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  
  // ✅ URLs
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  
  // ✅ Media metadata
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  duration: {
    type: Number  // For videos
  },
  
  // ✅ Post association (optional)
  postId: {
    type: String,
    index: true
  },
  
  // ✅ Status
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  },
  
  // ✅ Processing metadata
  processingError: {
    type: String
  },
  processedAt: {
    type: Date
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

// Indexes
MediaSchema.index({ userId: 1, createdAt: -1 });
MediaSchema.index({ postId: 1 });
MediaSchema.index({ fileType: 1 });
MediaSchema.index({ status: 1 });

let Media;

function getMediaModel() {
  if (!Media) {
    const conn = getSocialDB();
    Media = conn.model('Media', MediaSchema);
  }
  return Media;
}

module.exports = getMediaModel;