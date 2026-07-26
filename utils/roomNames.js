const ADJECTIVES = [
  'Turbo', 'Velocity', 'Neon', 'Shadow', 'Blaze', 'Nitro', 'Phantom', 'Rapid',
  'Chrome', 'Volt', 'Crimson', 'Midnight', 'Storm', 'Apex', 'Hyper', 'Rogue',
];

const NOUNS = [
  'Falcon', 'Viper', 'Circuit', 'Drift', 'Comet', 'Panther', 'Raptor', 'Bolt',
  'Cobra', 'Racer', 'Wolf', 'Phoenix', 'Rocket', 'Tiger', 'Speedway', 'Blitz',
];

function generateRoomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${a} ${n} ${num}`;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = { generateRoomName, generateRoomCode };
