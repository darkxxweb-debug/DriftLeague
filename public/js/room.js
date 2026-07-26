const username = localStorage.getItem('dl_username');
const carColor = localStorage.getItem('dl_color') || '#33E1FF';
const roomCode = window.ROOM_CODE;

const roomNameEl = document.getElementById('roomName');
const inviteLink = document.getElementById('inviteLink');
const copyBtn = document.getElementById('copyBtn');
const memberList = document.getElementById('memberList');
const readyBtn = document.getElementById('readyBtn');
const startBtn = document.getElementById('startBtn');
const statusMsg = document.getElementById('statusMsg');
const countdownOverlay = document.getElementById('countdownOverlay');

if (!username) {
  window.location.href = '/';
}

inviteLink.value = `${window.location.origin}/room/${roomCode}`;
copyBtn.addEventListener('click', () => {
  inviteLink.select();
  navigator.clipboard?.writeText(inviteLink.value);
  copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
  setTimeout(() => (copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>'), 1200);
});

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg show ${type}`;
}

fetch(`/api/rooms/${roomCode}`)
  .then((r) => r.json())
  .then((room) => {
    if (room.error) throw new Error(room.error);
    roomNameEl.textContent = room.name;
    if (room.hostUsername === username) startBtn.style.display = 'block';
  })
  .catch((err) => showStatus(err.message, 'error'));

const socket = io();
socket.emit('room:join', { code: roomCode, username, carColor });

let isReady = false;
readyBtn.addEventListener('click', () => {
  isReady = !isReady;
  socket.emit('room:ready', { ready: isReady });
  readyBtn.innerHTML = isReady
    ? '<i class="fa-solid fa-check-double"></i> Ready!'
    : '<i class="fa-solid fa-check"></i> I\'m ready';
});

startBtn.addEventListener('click', () => {
  socket.emit('room:start');
});

socket.on('room:update', ({ members }) => {
  if (!members.length) {
    memberList.innerHTML = '<div class="empty-state" style="padding:20px;">Waiting for drivers...</div>';
    return;
  }
  memberList.innerHTML = members
    .map(
      (m) => `
      <div class="member-row">
        <div class="member-dot" style="background:${m.carColor}"></div>
        <div class="member-name">${m.username}${m.username === username ? ' (you)' : ''}</div>
        <div class="member-tag ${m.ready ? 'ready' : ''}">${m.ready ? 'Ready' : 'Waiting'}</div>
      </div>`
    )
    .join('');
});

socket.on('room:countdown', () => {
  countdownOverlay.style.display = 'flex';
  countdownOverlay.style.inset = '0';
  let n = 3;
  countdownOverlay.textContent = n;
  const timer = setInterval(() => {
    n -= 1;
    countdownOverlay.textContent = n > 0 ? n : 'GO!';
    if (n <= 0) clearInterval(timer);
  }, 1000);
});

socket.on('room:go', () => {
  window.location.href = `/race/${roomCode}`;
});
