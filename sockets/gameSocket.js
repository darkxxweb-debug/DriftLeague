const Player = require('../models/Player');
const Room = require('../models/Room');
const { rankColor } = require('../utils/rank');

const TOTAL_LAPS = 3;

// In-memory race state per room (transient — MongoDB stores the durable stuff:
// players, rooms, points, ranks). Keyed by room code.
const rooms = new Map();

function getRoomState(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      members: new Map(), // socketId -> { username, carColor, ready, finished, finishTimeMs, place }
      status: 'waiting',
      startedAt: null,
    });
  }
  return rooms.get(code);
}

function publicMemberList(state) {
  return Array.from(state.members.values()).map((m) => ({
    username: m.username,
    carColor: m.carColor,
    ready: m.ready,
    finished: m.finished,
    place: m.place || null,
  }));
}

module.exports = function registerGameSockets(io) {
  io.on('connection', (socket) => {
    let joinedRoom = null;
    let username = null;

    socket.on('room:join', ({ code, username: uname, carColor }) => {
      if (!code || !uname) return;
      const roomCode = code.toUpperCase();
      joinedRoom = roomCode;
      username = uname;

      socket.join(roomCode);
      const state = getRoomState(roomCode);
      state.members.set(socket.id, {
        username: uname,
        carColor: carColor || '#33E1FF',
        ready: false,
        finished: false,
        finishTimeMs: null,
        place: null,
      });

      io.to(roomCode).emit('room:update', {
        status: state.status,
        members: publicMemberList(state),
      });
    });

    socket.on('room:ready', ({ ready }) => {
      if (!joinedRoom) return;
      const state = getRoomState(joinedRoom);
      const member = state.members.get(socket.id);
      if (!member) return;
      member.ready = !!ready;
      io.to(joinedRoom).emit('room:update', {
        status: state.status,
        members: publicMemberList(state),
      });
    });

    socket.on('room:start', () => {
      if (!joinedRoom) return;
      const state = getRoomState(joinedRoom);
      if (state.members.size < 1) return;

      state.status = 'countdown';
      state.startedAt = null;
      for (const m of state.members.values()) {
        m.finished = false;
        m.finishTimeMs = null;
        m.place = null;
      }

      io.to(joinedRoom).emit('room:countdown');

      setTimeout(() => {
        state.status = 'racing';
        state.startedAt = Date.now();
        io.to(joinedRoom).emit('room:go', { totalLaps: TOTAL_LAPS, startedAt: state.startedAt });
        Room.findOneAndUpdate({ code: joinedRoom }, { status: 'racing' }).catch(() => {});
      }, 3000);
    });

    // High-frequency position sync while racing
    socket.on('race:state', (payload) => {
      if (!joinedRoom) return;
      socket.to(joinedRoom).emit('race:opponent', { id: socket.id, ...payload });
    });

    socket.on('race:finish', async ({ timeMs }) => {
      if (!joinedRoom || !username) return;
      const state = getRoomState(joinedRoom);
      const member = state.members.get(socket.id);
      if (!member || member.finished) return;

      member.finished = true;
      member.finishTimeMs = timeMs;

      const finishedCount = Array.from(state.members.values()).filter((m) => m.finished).length;
      member.place = finishedCount;

      io.to(joinedRoom).emit('race:playerFinished', {
        username: member.username,
        place: member.place,
      });

      try {
        const player = await Player.findOne({ username: member.username });
        if (player) {
          player.applyRaceResult(member.place, timeMs);
          await player.save();
        }
      } catch (err) {
        console.error('Failed to record race result:', err.message);
      }

      const allFinished = Array.from(state.members.values()).every((m) => m.finished);
      if (allFinished) {
        state.status = 'finished';
        const results = Array.from(state.members.values())
          .sort((a, b) => (a.place || 999) - (b.place || 999))
          .map((m) => ({ username: m.username, place: m.place, timeMs: m.finishTimeMs }));
        io.to(joinedRoom).emit('race:results', results);
        Room.findOneAndUpdate({ code: joinedRoom }, { status: 'finished' }).catch(() => {});
      }
    });

    socket.on('disconnect', () => {
      if (!joinedRoom) return;
      const state = getRoomState(joinedRoom);
      state.members.delete(socket.id);
      io.to(joinedRoom).emit('room:update', {
        status: state.status,
        members: publicMemberList(state),
      });
      if (state.members.size === 0) rooms.delete(joinedRoom);
    });
  });
};
