const mongoose = require('mongoose');

// Denormalized cache of which tags a user engages with most.
const UserInterestSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },

  tagScores: {
    type: Map,
    of: Number,
    default: {}
  },

  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserInterest', UserInterestSchema);