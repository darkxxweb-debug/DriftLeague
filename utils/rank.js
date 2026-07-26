// Rank ladder, in the order requested: Bronze, Platinum, Diamond, Gold, Dominator.
const RANKS = [
  { name: 'Bronze', min: 0, color: '#CD7F32' },
  { name: 'Platinum', min: 1000, color: '#C7D0D9' },
  { name: 'Diamond', min: 2500, color: '#7FE7FF' },
  { name: 'Gold', min: 4500, color: '#FFD65C' },
  { name: 'Dominator', min: 7000, color: '#FF2E9A' },
];

function rankForPoints(points) {
  let current = RANKS[0];
  for (const tier of RANKS) {
    if (points >= tier.min) current = tier;
  }
  return current.name;
}

function rankColor(rankName) {
  const tier = RANKS.find((r) => r.name === rankName);
  return tier ? tier.color : RANKS[0].color;
}

// Simple points award: 1st = 120, 2nd = 90, 3rd = 70, then -10 per place, floor 20.
function pointsForPlacement(place) {
  const table = [120, 90, 70, 55, 45, 35];
  return table[place - 1] ?? 20;
}

module.exports = { RANKS, rankForPoints, rankColor, pointsForPlacement };
