const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');

const FollowSchema = new mongoose.Schema({
  followId: { type: String, required: true, unique: true, index: true },

  followerId: { type: String, required: true, index: true },  // who is following
  followingId: { type: String, required: true, index: true }, // who is being followed

  // Forward-compatible: once LifeCrafter profiles exist, this distinguishes
  // "following a verified mentor" vs "following a regular member"
  targetType: {
    type: String,
    enum: ['user', 'lifecrafter'],
    default: 'user'
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

// A user can only follow the same person once
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
let Follow;

function getFollowModel() {
  if (!Follow) {
    const conn = getSocialDB();
    Follow = conn.model('Follow', FollowSchema);
  }
  return Follow;
}

module.exports = getFollowModel;