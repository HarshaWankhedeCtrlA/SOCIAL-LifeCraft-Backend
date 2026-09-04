const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  likeId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },

  // Polymorphic target - post or comment
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: String, required: true, index: true },

  postId: { type: String, required: true, index: true } // always store parent post for fast counts
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

// Prevent duplicate likes by same user on same target
LikeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Like', LikeSchema);