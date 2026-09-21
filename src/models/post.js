const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db');
const PostSchema = new mongoose.Schema({
  // ============================================
  // ✅ CORE IDENTIFIERS
  // ============================================
  postId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  communityId: {
    type: String,
    required: true,
    index: true
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  
  // ============================================
  // ✅ CONTENT
  // ============================================
  title: {
    type: String,
    maxlength: 300,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  
  // ✅ Rich Text Formatting
  formattedContent: {
    type: String,  // HTML or Markdown formatted content
    default: null
  },
  
  // ✅ Content Type
  contentType: {
    type: String,
    enum: ['text', 'image', 'video', 'poll', 'link', 'event'],
    default: 'text'
  },
  
  // ============================================
  // ✅ TAGS & MENTIONS (Rich Media Features)
  // ============================================
  tags: {
    type: [String],
    default: [],
    index: true,
    validate: {
      validator: function(tags) {
        return tags.length <= 10;
      },
      message: 'Maximum 10 tags allowed per post'
    }
  },
  
  // ✅ Hashtags extracted from content
  hashtags: {
    type: [String],
    default: [],
    index: true
  },
  
  // ✅ Mentions (@username)
  mentions: {
    type: [String],  // Array of user IDs mentioned
    default: [],
    index: true
  },
  
  category: {
    type: String,
    trim: true
  },
  
  // ============================================
  // ✅ MEDIA (Images, Videos, Rich Media)
  // ============================================
  media: {
    type: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
      thumbnail: { type: String },
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },  // For videos
      size: { type: Number },
      caption: { type: String },
      order: { type: Number, default: 0 }
    }],
    default: []
  },
  
  // ✅ Cover/Featured Image
  coverImage: {
    url: { type: String },
    caption: { type: String }
  },
  
  // ============================================
  // ✅ VISIBILITY & STATUS
  // ============================================
  visibility: {
    type: String,
    enum: ['public', 'members_only', 'private'],
    default: 'public'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'reported', 'pending_review'],
    default: 'published'
  },
  
  // ============================================
  // ✅ FEATURES
  // ============================================
  isPinned: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: {
    type: [{
      content: { type: String },
      editedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  
  // ============================================
  // ✅ METADATA (for polls, links, etc.)
  // ============================================
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Poll data
  pollData: {
    question: { type: String },
    options: [{
      text: { type: String },
      votes: { type: Number, default: 0 }
    }],
    totalVotes: { type: Number, default: 0 },
    expiresAt: { type: Date }
  },
  
  // Link preview
  linkPreview: {
    url: { type: String },
    title: { type: String },
    description: { type: String },
    image: { type: String },
    siteName: { type: String }
  },
  
  // ============================================
  // ✅ DENORMALIZED COUNTERS
  // ============================================
  likeCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  saveCount: {
    type: Number,
    default: 0
  },
  
  // ============================================
  // ✅ TIMESTAMPS
  // ============================================
  publishedAt: {
    type: Date,
    default: Date.now
  },
  archivedAt: {
    type: Date
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  
  // Scheduled publishing
  scheduledAt: {
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


PostSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    // Extract hashtags
    const hashtagRegex = /#[\w\u00c0-\u024f]+/g;
    const contentWithTitle = (this.title || '') + ' ' + this.content;
    const matches = contentWithTitle.match(hashtagRegex) || [];
    this.hashtags = [...new Set(matches.map(h => h.toLowerCase()))];
    
    const mentionRegex = /@[\w\u00c0-\u024f]+/g;
    const mentionMatches = contentWithTitle.match(mentionRegex) || [];
    this.mentions = [...new Set(mentionMatches.map(m => m.toLowerCase()))];
   
    if (this.content) {
      this.formattedContent = this.content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/#\w+/g, match => `<a href="/tags/${match.slice(1)}">${match}</a>`);
    }
  }
  next();
});
let Post;

function getPostModel() {
  if (!Post) {
    const conn = getSocialDB();
    Post = conn.model('Post', PostSchema);
  }
  return Post;
}
module.exports = getPostModel;