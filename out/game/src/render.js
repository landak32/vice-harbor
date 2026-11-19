// A thin facade over the renderer in render/: the scene builder, the frame function, the minimap
// baker and the HUD, re-exported under the names the rest of the project uses. The actual
// drawing lives in one module per subject under render/.

export { createScene, renderScene, attachMinimap } from './render/scene.js';
export { buildMinimapImage } from './render/minimap.js';
export { drawHud } from './render/hud.js';
export { drawTitle, drawPause, drawControls, drawStats, drawEnding, drawBanner } from './render/screens.js';
export { nightAmount, drawLights, drawAmbient, drawVignette } from './render/lighting.js';
