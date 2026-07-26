const lbList = document.getElementById('lbList');
const emptyState = document.getElementById('emptyState');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

fetch('/api/leaderboard/top')
  .then((r) => r.json())
  .then((players) => {
    if (!players.length) {
      emptyState.style.display = 'block';
      return;
    }
    lbList.innerHTML = players
      .map(
        (p, i) => `
      <div class="lb-row">
        <div class="lb-pos">#${i + 1}</div>
        <div class="lb-car" style="background:${p.carColor}"></div>
        <div class="lb-name">
          ${escapeHtml(p.username)}
          <div class="rank-badge" style="color:${p.rankColor}; margin-top:4px;">${p.rank}</div>
        </div>
        <div class="lb-points">${p.points} pts</div>
      </div>`
      )
      .join('');
  })
  .catch(() => {
    emptyState.style.display = 'block';
  });
