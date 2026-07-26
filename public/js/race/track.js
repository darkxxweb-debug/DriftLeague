// Classic segment-based pseudo-3D track. Each segment is a fixed-length slice
// of road with a curve amount and a height (hill) value. The whole track loops
// so laps work naturally.
const Track = (() => {
  const SEGMENT_LENGTH = 200;
  const ROAD_WIDTH = 2000;
  const RUMBLE_LENGTH = 3;

  function buildSegments() {
    const segments = [];

    function addSegment(curve, y) {
      const n = segments.length;
      segments.push({
        index: n,
        curve,
        p1: { world: { y: lastY, z: n * SEGMENT_LENGTH } },
        p2: { world: { y, z: (n + 1) * SEGMENT_LENGTH } },
      });
      lastY = y;
    }

    function addRoad(enterLen, holdLen, leaveLen, curve, height) {
      const startY = lastY;
      const endY = startY + height;
      const total = enterLen + holdLen + leaveLen;
      for (let i = 0; i < enterLen; i++) addSegment(easeIn(0, curve, i / enterLen), startY);
      for (let i = 0; i < holdLen; i++) addSegment(curve, startY + easeInOut(0, height, i / holdLen));
      for (let i = 0; i < leaveLen; i++) addSegment(easeInOut(curve, 0, i / leaveLen), endY);
    }

    function easeIn(a, b, t) { return a + (b - a) * t * t; }
    function easeInOut(a, b, t) { return a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5); }

    var lastY = 0;

    // Build a lap out of straights, curves and a couple of hills.
    addRoad(60, 40, 60, 0, 0);       // start straight
    addRoad(50, 60, 50, 3.2, 0);     // gentle right
    addRoad(40, 40, 40, 0, 400);     // hill up
    addRoad(50, 80, 50, -3.6, -400); // long left + descend
    addRoad(60, 40, 60, 0, 0);       // straight
    addRoad(40, 50, 40, 5.2, 200);   // sharp right + rise
    addRoad(40, 50, 40, -5.2, -200); // sharp left + fall
    addRoad(60, 60, 60, 2.0, 0);     // easy right
    addRoad(80, 40, 80, 0, 0);       // finishing straight

    return segments;
  }

  const segments = buildSegments();
  const trackLength = segments.length * SEGMENT_LENGTH;

  function findSegment(z) {
    const idx = Math.floor((z % trackLength) / SEGMENT_LENGTH) % segments.length;
    return segments[idx < 0 ? idx + segments.length : idx];
  }

  return { SEGMENT_LENGTH, ROAD_WIDTH, RUMBLE_LENGTH, segments, trackLength, findSegment };
})();
