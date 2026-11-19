// Keyboard, mouse and the small queue of one-shot presses. Held keys are read straight from a
// Set; presses are collected in a Set and drained once per frame by the loop, so a tap between
// two frames is never lost and never counted twice. Mouse coordinates are kept in the game's
// 1280x720 logical space, converted through the canvas's on-screen box.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, down: false, clicked: false };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    pressed.add(event.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', toLogical);
  canvas.addEventListener('pointerdown', (event) => {
    toLogical(event);
    mouse.down = true;
    mouse.clicked = true;
    canvas.focus?.();
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    isDown(code) {
      return held.has(code);
    },
    anyDown(...codes) {
      for (const code of codes) if (held.has(code)) return true;
      return false;
    },
    /** True once per physical press. */
    wasPressed(code) {
      return pressed.has(code);
    },
    /** Drops the one-shot presses; the loop calls this at the end of every frame. */
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    /** -1 left, 1 right, 0 neither or both. */
    axisX() {
      const left = held.has('KeyA') || held.has('ArrowLeft');
      const right = held.has('KeyD') || held.has('ArrowRight');
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    axisY() {
      const up = held.has('KeyW') || held.has('ArrowUp');
      const down = held.has('KeyS') || held.has('ArrowDown');
      return (down ? 1 : 0) - (up ? 1 : 0);
    },
  };
}
