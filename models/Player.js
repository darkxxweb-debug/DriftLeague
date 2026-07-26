const mongoose = require('mongoose');
const { rankForPoints } = require('../utils/rank');

const playerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 18,
    },
    carColor: {
      type: String,
      default: '#33E1FF',
    },
    points: { type: Number, default: 0 },
    rank: { type: String, default: 'Bronze' },
    racesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    bestLapMs: { type: Number, default: null },
  },
  { timestamps: true }
);

playerSchema.methods.applyRaceResult = function (place, lapMs) {
  const { pointsForPlacement } = require('../utils/rank');
  this.points += pointsForPlacement(place);
  this.racesPlayed += 1;
  if (place === 1) this.wins += 1;
  if (lapMs && (!this.bestLapMs || lapMs < this.bestLapMs)) this.bestLapMs = lapMs;
  this.rank = rankForPoints(this.points);
};

module.exports = mongoose.model('Player', playerSchema);
