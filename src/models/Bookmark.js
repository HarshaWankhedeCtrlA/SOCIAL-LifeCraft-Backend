const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');
const BookmarkSchema = new mongoose.Schema({
  bookmarkId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  postId: { type: String, required: true, index: true },

  // Optional: let users organize saved posts into collections/folders
  collectionName: { type: String, default: 'default', trim: true }
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

// A user can only bookmark the same post once
BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

let Bookmark;

function getBookmarkModel() {
  if (!Bookmark) {
    const conn = getSocialDB();
    Bookmark = conn.model('Bookmark', BookmarkSchema);
  }
  return Bookmark;
}

module.exports = getBookmarkModel;