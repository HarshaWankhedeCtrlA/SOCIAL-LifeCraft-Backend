const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  commentId: { type: String, required: true, unique: true, index: true },
  postId: { type: String, required: true, index: true },
  authorId: { type: String, required: true, index: true },

  content: { type: String, required: true, maxlength: 2000 },

  // Null = top-level comment. Set = this is a reply.
  parentCommentId: { type: String, default: null, index: true },

  // Denormalized for fast thread traversal (top-level comment this belongs to)
  rootCommentId: { type: String, default: null, index: true },

  mentions: { type: [String], default: [] },

  likeCount: { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },

  isEdited: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'deleted', 'hidden'], default: 'active' }
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

CommentSchema.index({ postId: 1, parentCommentId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);