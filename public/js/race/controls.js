const Controls = (() => {
  const state = { steer: 0, gas: false, brake: false };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') state.steer = -1;
    if (e.key === 'ArrowRight' || e.key === 'd') state.steer = 1;
    if (e.key === 'ArrowUp' || e.key === 'w') state.gas = true;
    if (e.key === 'ArrowDown' || e.key === 's') state.brake = true;
  });
  window.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowLeft' || e.key === 'a') && state.steer === -1) state.steer = 0;
    if ((e.key === 'ArrowRight' || e.key === 'd') && state.steer === 1) state.steer = 0;
    if (e.key === 'ArrowUp' || e.key === 'w') state.gas = false;
    if (e.key === 'ArrowDown' || e.key === 's') state.brake = false;
  });

  function bindTouch(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { e.preventDefault(); onDown(); };
    const end = (e) => { e.preventDefault(); onUp(); };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }

  bindTouch('btnLeft', () => (state.steer = -1), () => { if (state.steer === -1) state.steer = 0; });
  bindTouch('btnRight', () => (state.steer = 1), () => { if (state.steer === 1) state.steer = 0; });
  bindTouch('btnGas', () => (state.gas = true), () => (state.gas = false));
  bindTouch('btnBrake', () => (state.brake = true), () => (state.brake = false));

  return state;
})();
