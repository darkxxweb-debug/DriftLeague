const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Room = require('../models/Room');
const { generateRoomName, generateRoomCode } = require('../utils/roomNames');
const { rankColor } = require('../utils/rank');

// POST /api/players - create or fetch a player profile by username
router.post('/api/players', async (req, res) => {
  try {
    const { username, carColor } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    const clean = username.trim().slice(0, 18);

    let player = await Player.findOne({ username: clean });
    if (!player) {
      player = await Player.create({ username: clean, carColor: carColor || '#33E1FF' });
    } else if (carColor) {
      player.carColor = carColor;
      await player.save();
    }

    res.json(player);
  } catch (err) {
    res.status(400).json({ error: 'Could not create player. Try a different name.' });
  }
});

// GET /api/leaderboard/top - top 20 players by points
router.get('/api/leaderboard/top', async (req, res) => {
  try {
    const players = await Player.find().sort({ points: -1 }).limit(20);
    res.json(
      players.map((p) => ({
        username: p.username,
        points: p.points,
        rank: p.rank,
        rankColor: rankColor(p.rank),
        wins: p.wins,
        racesPlayed: p.racesPlayed,
        carColor: p.carColor,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'Could not load leaderboard.' });
  }
});

// POST /api/rooms - create a room with a special generated name + short invite code
router.post('/api/rooms', async (req, res) => {
  try {
    const { hostUsername } = req.body;
    if (!hostUsername) return res.status(400).json({ error: 'Host username is required.' });

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      // eslint-disable-next-line no-await-in-loop
      var exists = await Room.findOne({ code });
    } while (exists && attempts < 8);

    const room = await Room.create({
      code,
      name: generateRoomName(),
      hostUsername,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: 'Could not create room.' });
  }
});

// GET /api/rooms/:code - fetch room info (used by invite links)
router.get('/api/rooms/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found. It may have expired.' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Could not load room.' });
  }
});

module.exports = router;
