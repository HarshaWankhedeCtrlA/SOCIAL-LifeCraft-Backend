const mongoose = require('mongoose');

const ShareSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  postId: { type: String, required: true, index: true },

  // internal = shared to another community/user inside LifeCraft
  // external = shared to whatsapp/facebook/link copy etc.
  shareType: { type: String, enum: ['internal', 'external'], required: true },

  // For internal shares
  targetCommunityId: { type: String, default: null },
  message: { type: String, maxlength: 500 },

  // For external shares
  platform: { type: String, enum: ['internal', 'whatsapp', 'facebook', 'twitter', 'linkedin', 'copy_link', 'other'],   default: 'internal' }
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

module.exports = mongoose.model('Share', ShareSchema);