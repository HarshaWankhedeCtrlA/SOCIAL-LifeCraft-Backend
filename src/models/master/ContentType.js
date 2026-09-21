'use strict';

const mongoose = require('mongoose');
const { getMasterDB  } = require('../../config/db');

const contentTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true, // TEXT_POST, IMAGE_POST, VIDEO_POST, ARTICLE
    },
    name: {
      type: String,
      required: true, // "Text Post", "Image Post"
    },
    max_media_count: {
      type: Number,
      default: 1,
    },
    max_duration_seconds: {
      type: Number,
      default: null, // for video snippets, null = not applicable
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

let ContentType;

function getContentTypeModel() {
  if (!ContentType) {
    const conn = getMasterDB();
    ContentType = conn.model('ContentType', contentTypeSchema);
  }
  return ContentType;
}

module.exports = getContentTypeModel;