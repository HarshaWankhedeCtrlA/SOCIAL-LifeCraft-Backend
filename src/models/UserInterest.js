const mongoose = require('mongoose');
const { getSocialDB } = require('../config/db'); 
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

let UserInterest;                                       

function getUserInterestModel() {                       
  if (!UserInterest) {
    const conn = getSocialDB();
    UserInterest = conn.model('UserInterest', UserInterestSchema);
  }
  return UserInterest;
}

module.exports = getUserInterestModel;  