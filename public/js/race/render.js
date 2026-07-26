const Render = (() => {
  function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera = p.camera || {};
    p.screen = p.screen || {};
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / (p.camera.z || 1);
    p.screen.x = Math.round(width / 2 + (p.screen.scale * p.camera.x * width) / 2);
    p.screen.y = Math.round(height / 2 - (p.screen.scale * p.camera.y * height) / 2);
    p.screen.w = Math.round((p.screen.scale * roadWidth * width) / 2);
  }

  function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function renderBackground(ctx, width, height, skyOffset) {
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    sky.addColorStop(0, '#050914');
    sky.addColorStop(0.6, '#0d1830');
    sky.addColorStop(1, '#182642');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height * 0.55);

    // distant city glow strip, parallaxed a little with the curve
    ctx.fillStyle = 'rgba(51,225,255,0.06)';
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 240 - skyOffset * 0.3) % (width + 240)) - 120;
      ctx.fillRect(bx, height * 0.32, 60, height * 0.22);
    }

    // ground below horizon
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, height * 0.55, width, height * 0.45);
  }

  function segmentPoly(ctx, width, x1, y1, w1, x2, y2, w2, colors) {
    const r1 = w1 / Track.RUMBLE_LENGTH;
    const r2 = w2 / Track.RUMBLE_LENGTH;
    const l1 = w1 / 9;
    const l2 = w2 / 9;

    // grass
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, y2, width, y1 - y2);

    // rumble strips
    polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, colors.rumble);
    polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, colors.rumble);

    // road
    polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, colors.road);

    // lane markers
    if (colors.lane) {
      polygon(ctx, x1 - l1, y1, x1 + l1, y1, x2 + l2, y2, x2 - l2, y2, colors.lane);
    }
  }

  function renderSegment(ctx, width, x1, y1, w1, x2, y2, w2, index) {
    const alt = Math.floor(index / 3) % 2 === 0;
    const colors = alt
      ? { grass: '#0d1f14', rumble: '#d43b3b', road: '#22242E', lane: '#e8ecfa' }
      : { grass: '#0a1a10', rumble: '#e8ecfa', road: '#25272F', lane: null };
    segmentPoly(ctx, width, x1, y1, w1, x2, y2, w2, colors);
  }

  // Draw a simple stylized top-down car sprite (works well at pseudo-3D scale)
  function drawCar(ctx, x, y, scale, color, wobble) {
    const w = 46 * scale;
    const h = 78 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wobble || 0);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.42, w * 0.55, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, shade(color, 25));
    grad.addColorStop(1, shade(color, -25));
    ctx.fillStyle = grad;
    roundedRect(ctx, -w / 2, -h / 2, w, h, w * 0.28);
    ctx.fill();

    // windshield
    ctx.fillStyle = 'rgba(15,20,30,0.85)';
    roundedRect(ctx, -w * 0.32, -h * 0.28, w * 0.64, h * 0.32, w * 0.18);
    ctx.fill();

    // headlights / taillights
    ctx.fillStyle = '#fff9d8';
    ctx.fillRect(-w * 0.4, -h * 0.48, w * 0.18, h * 0.08);
    ctx.fillRect(w * 0.22, -h * 0.48, w * 0.18, h * 0.08);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(-w * 0.4, h * 0.4, w * 0.18, h * 0.08);
    ctx.fillRect(w * 0.22, h * 0.4, w * 0.18, h * 0.08);

    ctx.restore();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shade(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);
    return `rgb(${r},${g},${b})`;
  }

  return { project, renderBackground, renderSegment, drawCar };
})();
