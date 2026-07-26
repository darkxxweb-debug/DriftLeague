const COLORS = ['#33E1FF', '#FF2E9A', '#FFB020', '#4CFF7A', '#FF4D4D', '#B084FF', '#FFFFFF', '#FF8A3D'];

const colorGrid = document.getElementById('colorGrid');
const usernameInput = document.getElementById('username');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const joinCode = document.getElementById('joinCode');
const statusMsg = document.getElementById('statusMsg');

let selectedColor = localStorage.getItem('dl_color') || COLORS[0];
usernameInput.value = localStorage.getItem('dl_username') || '';

function renderColors() {
  colorGrid.innerHTML = COLORS.map(
    (c) => `<div class="color-dot ${c === selectedColor ? 'active' : ''}" style="background:${c}" data-color="${c}"></div>`
  ).join('');
  colorGrid.querySelectorAll('.color-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      selectedColor = dot.dataset.color;
      renderColors();
    });
  });
}
renderColors();

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg show ${type}`;
}

async function ensurePlayer() {
  const username = usernameInput.value.trim();
  if (!username) {
    showStatus('Enter a driver name first.', 'error');
    return null;
  }
  localStorage.setItem('dl_username', username);
  localStorage.setItem('dl_color', selectedColor);

  const res = await fetch('/api/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, carColor: selectedColor }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not create profile.');
  return data;
}

createBtn.addEventListener('click', async () => {
  createBtn.disabled = true;
  try {
    const player = await ensurePlayer();
    if (!player) {
      createBtn.disabled = false;
      return;
    }
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostUsername: player.username }),
    });
    const room = await res.json();
    if (!res.ok) throw new Error(room.error || 'Could not create room.');
    window.location.href = `/room/${room.code}`;
  } catch (err) {
    showStatus(err.message, 'error');
    createBtn.disabled = false;
  }
});

joinBtn.addEventListener('click', async () => {
  joinBtn.disabled = true;
  try {
    const player = await ensurePlayer();
    if (!player) {
      joinBtn.disabled = false;
      return;
    }
    const code = joinCode.value.trim().toUpperCase();
    if (!code) throw new Error('Enter a room code.');

    const res = await fetch(`/api/rooms/${code}`);
    const room = await res.json();
    if (!res.ok) throw new Error(room.error || 'Room not found.');
    window.location.href = `/room/${room.code}`;
  } catch (err) {
    showStatus(err.message, 'error');
    joinBtn.disabled = false;
  }
});
