(() => {
  const canvas = document.getElementById('raceCanvas');
  const ctx = canvas.getContext('2d');

  const username = localStorage.getItem('dl_username') || 'Driver';
  const carColor = localStorage.getItem('dl_color') || '#33E1FF';
  const roomCode = window.ROOM_CODE;

  const lapChip = document.getElementById('lapChip');
  const timeChip = document.getElementById('timeChip');
  const posChip = document.getElementById('posChip');
  const speedVal = document.getElementById('speedVal');
  const raceCountdown = document.getElementById('raceCountdown');
  const resultsOverlay = document.getElementById('resultsOverlay');
  const resultsList = document.getElementById('resultsList');

  const TOTAL_LAPS = 3;

  // ---- constants ----
  const fieldOfView = 100;
  const cameraHeight = 1000;
  const cameraDepth = 1 / Math.tan(((fieldOfView / 2) * Math.PI) / 180);
  const drawDistance = 180;
  const playerZ = cameraHeight * cameraDepth;
  const segmentLength = Track.SEGMENT_LENGTH;
  const roadWidth = Track.ROAD_WIDTH;
  const trackLength = Track.trackLength;

  const maxSpeed = segmentLength * 45;
  const accel = maxSpeed / 4;
  const breakingPower = -maxSpeed;
  const decel = -maxSpeed / 5;
  const offRoadDecel = -maxSpeed / 2;
  const offRoadLimit = maxSpeed / 4;
  const centrifugal = 0.3;

  // ---- state ----
  let width, height, resolution;
  let position = 0;
  let speed = 0;
  let playerX = 0;
  let lastLap = 0;
  let lapCount = 1;
  let raceStarted = false;
  let raceFinished = false;
  let raceStartTime = null;
  let lastTime = null;

  const opponents = new Map(); // socketId -> { username, carColor, z, x, speed }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    resolution = height / 480;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  function percentRemaining(n, total) {
    return ((n % total) + total) % total / total;
  }
  function interpolate(a, b, percent) {
    return a + (b - a) * percent;
  }
  function limit(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function accelerate(v, rate, dt) {
    return v + rate * dt;
  }

  // ---- multiplayer ----
  const socket = io();
  socket.emit('room:join', { code: roomCode, username, carColor });

  socket.on('room:go', () => startCountdown());
  socket.on('race:opponent', (data) => {
    opponents.set(data.id, { ...data, lastSeen: Date.now() });
  });
  socket.on('race:results', (results) => {
    raceFinished = true;
    resultsList.innerHTML = results
      .map(
        (r) => `
      <div class="member-row">
        <div class="member-name">#${r.place} · ${r.username}</div>
        <div class="member-tag">${(r.timeMs / 1000).toFixed(1)}s</div>
      </div>`
      )
      .join('');
    resultsOverlay.classList.add('show');
  });

  // If we land on /race directly (e.g. reconnect), start our own short countdown
  startCountdown();

  function startCountdown() {
    if (raceStarted) return;
    let n = 3;
    raceCountdown.style.display = 'flex';
    raceCountdown.textContent = n;
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) {
        raceCountdown.textContent = n;
      } else {
        raceCountdown.textContent = 'GO!';
        setTimeout(() => {
          raceCountdown.style.display = 'none';
          raceStarted = true;
          raceStartTime = Date.now();
        }, 500);
        clearInterval(timer);
      }
    }, 800);
  }

  let lastSend = 0;
  function sendState(now) {
    if (now - lastSend < 90) return;
    lastSend = now;
    socket.emit('race:state', { z: position, x: playerX, speed, username, carColor });
  }

  function finishRace() {
    if (raceFinished) return;
    raceFinished = true;
    const timeMs = Date.now() - raceStartTime;
    socket.emit('race:finish', { timeMs });
  }

  // ---- physics ----
  function update(dt) {
    if (!raceStarted || raceFinished) return;

    const playerSegment = Track.findSegment(position + playerZ);
    const speedPercent = speed / maxSpeed;
    const dx = dt * 2 * speedPercent;

    position += dt * speed;

    if (Controls.steer < 0) playerX -= dx;
    else if (Controls.steer > 0) playerX += dx;

    playerX -= dx * speedPercent * playerSegment.curve * centrifugal;

    if (Controls.gas) speed = accelerate(speed, accel, dt);
    else if (Controls.brake) speed = accelerate(speed, breakingPower, dt);
    else speed = accelerate(speed, decel, dt);

    if ((playerX < -1 || playerX > 1) && speed > offRoadLimit) {
      speed = accelerate(speed, offRoadDecel, dt);
    }

    playerX = limit(playerX, -2, 2);
    speed = limit(speed, 0, maxSpeed);

    const lapNow = Math.floor(position / trackLength);
    if (lapNow > lastLap) {
      lastLap = lapNow;
      lapCount = Math.min(lapNow + 1, TOTAL_LAPS);
      if (lapNow >= TOTAL_LAPS) finishRace();
    }
  }

  // ---- render ----
  function render() {
    const baseSegment = Track.findSegment(position);
    const basePercent = percentRemaining(position, segmentLength);
    const playerSegment = Track.findSegment(position + playerZ);
    const playerPercent = percentRemaining(position + playerZ, segmentLength);
    const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    let maxy = height;

    Render.renderBackground(ctx, width, height, position * 0.02);

    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    for (let n = 0; n < drawDistance; n++) {
      const segment = Track.segments[(baseSegment.index + n) % Track.segments.length];
      segment.looped = segment.index < baseSegment.index;

      Render.project(
        segment.p1,
        playerX * roadWidth - x,
        playerY + cameraHeight,
        position - (segment.looped ? trackLength : 0),
        cameraDepth, width, height, roadWidth
      );
      Render.project(
        segment.p2,
        playerX * roadWidth - x - dx,
        playerY + cameraHeight,
        position - (segment.looped ? trackLength : 0),
        cameraDepth, width, height, roadWidth
      );

      segment._projX = x;
      x += dx;
      dx += segment.curve;

      if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= segment.p1.screen.y || segment.p2.screen.y >= maxy) {
        continue;
      }

      Render.renderSegment(
        ctx, width,
        segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
        segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w,
        segment.index
      );

      maxy = segment.p2.screen.y;
    }

    // opponents (draw far-to-near-ish; simple z sort)
    const now = Date.now();
    const activeOpponents = Array.from(opponents.values()).filter((o) => now - o.lastSeen < 4000);
    activeOpponents.sort((a, b) => b.z - a.z);

    activeOpponents.forEach((o) => {
      const seg = Track.findSegment(o.z);
      const percent = percentRemaining(o.z, segmentLength);
      const y = interpolate(seg.p1.world.y, seg.p2.world.y, percent);
      const point = { world: { x: 0, y, z: o.z } };
      const offset = seg._projX || 0;

      Render.project(point, playerX * roadWidth - offset, playerY + cameraHeight, position, cameraDepth, width, height, roadWidth);

      if (point.camera.z <= cameraDepth) return;
      const screenX = point.screen.x + o.x * point.screen.w;
      const scale = point.screen.scale * resolution * 900;
      if (scale < 4 || point.screen.y < 0 || point.screen.y > height) return;

      Render.drawCar(ctx, screenX, point.screen.y, scale / 300, o.carColor || '#FF2E9A', 0);
    });

    // player's own car, fixed near bottom center, tilts slightly with steer
    const wobble = Controls.steer * 0.06;
    Render.drawCar(ctx, width / 2 + playerX * width * 0.18, height - 92 * resolution, resolution * 1.5, carColor, wobble);
  }

  function updateHud() {
    speedVal.textContent = Math.round((speed / maxSpeed) * 260);
    lapChip.textContent = `LAP ${lapCount}/${TOTAL_LAPS}`;

    const rank = 1 + Array.from(opponents.values()).filter((o) => o.z > position).length;
    posChip.textContent = `POS ${rank}`;

    if (raceStarted && !raceFinished) {
      const elapsed = (Date.now() - raceStartTime) / 1000;
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toFixed(1).padStart(4, '0');
      timeChip.textContent = `${m}:${s}`;
    }
  }

  function loop(t) {
    if (lastTime === null) lastTime = t;
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;

    update(dt);
    render();
    updateHud();
    sendState(t);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
