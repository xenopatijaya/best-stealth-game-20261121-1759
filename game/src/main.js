// main.js — one job: glue. Game loop, screens (title / pause / win /
// lose), keyboard + mouse input, HUD updates, level flow. The rules
// themselves live in guards.js, player.js and levels.js.
import { TILE, VIEW_W, VIEW_H, MAX_CHANCES, PEBBLE_HEAR_RADIUS_TILES, CATCH_DISTANCE_TILES } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { Guard, Camera, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { createRenderer } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const renderer = createRenderer(canvas);
const sound = new SoundBank();

const el = (id) => document.getElementById(id);
const hud = {
  level: el('hud-level'),
  relics: el('hud-relics'),
  pebbles: el('hud-pebbles'),
  chances: el('hud-chances'),
  timer: el('hud-timer'),
  best: el('hud-best'),
  eye: el('hud-eye-fill'),
  eyeLabel: el('hud-eye-label'),
  message: el('hud-message'),
};
const screens = {
  title: el('screen-title'),
  pause: el('screen-pause'),
  win: el('screen-win'),
  over: el('screen-over'),
  level: el('screen-level'),
};

const input = { up: false, down: false, left: false, right: false, sneak: false };

const state = {
  screen: 'title',
  levelIndex: 0,
  world: null,
  player: null,
  guards: [],
  cameras: [],
  pebbleMarks: [],
  detection: 0,
  chances: MAX_CHANCES,
  time: 0,
  levelTime: 0,
  message: '',
  messageTimer: 0,
  shotMode: false,
  exitOpen: false,
  lastPlayerStep: 0,
  lastGuardSteps: new Map(),
};

function bestKey(levelIndex) {
  return `gallery-after-dark-best-${levelIndex}`;
}

function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) {
    node.classList.toggle('hidden', key !== name);
  }
  state.screen = name;
}

function setMessage(text, seconds = 3) {
  state.message = text;
  state.messageTimer = seconds;
  hud.message.textContent = text;
}

export function loadLevel(index) {
  state.levelIndex = index;
  const def = LEVELS[index];
  state.world = parseLevel(def);
  state.player = new Player(state.world.start);
  state.player.pebbles = def.pebbles;
  state.guards = def.guards.map((g) => new Guard(g, state.world));
  state.cameras = (def.cameras || []).map((c) => new Camera(c, state.world));
  state.pebbleMarks = [];
  state.detection = 0;
  state.levelTime = 0;
  state.exitOpen = false;
  state.lastGuardSteps = new Map();
  hud.level.textContent = def.name;
  const best = localStorage.getItem(bestKey(index));
  hud.best.textContent = best ? `Best ${best}` : 'Best —';
  setMessage(def.sub, 4);
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateHud() {
  const total = state.world.relics.length;
  hud.relics.textContent = `Relics ${state.player.relics}/${total}`;
  hud.pebbles.textContent = `Pebbles ${state.player.pebbles}`;
  hud.chances.textContent = '♥'.repeat(Math.max(0, state.chances)) + '♡'.repeat(Math.max(0, MAX_CHANCES - state.chances));
  hud.timer.textContent = fmtTime(state.levelTime);
  hud.eye.style.width = `${Math.round(state.detection)}%`;
  hud.eye.style.background = state.detection >= 100 ? '#f03c32' : state.detection >= 30 ? '#f0c83c' : '#7ee787';
  hud.eyeLabel.textContent = state.detection >= 100 ? 'SPOTTED!' : state.detection >= 30 ? 'Suspicious…' : state.detection > 0 ? 'Seen?' : 'Unseen';
  if (state.messageTimer > 0) {
    hud.message.textContent = state.message;
  } else {
    hud.message.textContent = '';
  }
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'suspicious') {
      sound.suspiciousBlip();
      setMessage(`${ev.guard.name} heard something…`, 2.5);
    } else if (ev.type === 'alert' || ev.type === 'camera-alert') {
      sound.alertSting();
      setMessage(ev.type === 'camera-alert' ? `Camera spotted you — ${ev.guard.name} is coming!` : `${ev.guard.name} spotted you! Run!`, 3);
    } else if (ev.type === 'calmed') {
      setMessage(`${ev.guard.name} lost you. Stay low.`, 2.5);
    }
  }
}

function doThrowPebble() {
  if (state.screen !== 'playing') return;
  const landing = state.player.throwPebble();
  if (!landing) {
    setMessage('No pebbles left!', 2);
    return;
  }
  // Clamp the landing point inside the map.
  landing.x = Math.max(0.5, Math.min(LEVELS[state.levelIndex].map[0].length - 0.5, landing.x));
  landing.y = Math.max(0.5, Math.min(LEVELS[state.levelIndex].map.length - 0.5, landing.y));
  state.pebbleMarks.push({ x: landing.x, y: landing.y });
  sound.pebbleClink();
  for (const guard of state.guards) guard.hearNoise(landing.x, landing.y, PEBBLE_HEAR_RADIUS_TILES);
  setMessage('Pebble thrown — they heard that.', 2);
}

function caughtBy(guard) {
  state.chances -= 1;
  sound.loseSting();
  if (state.chances <= 0) {
    el('over-stats').textContent = `Caught on ${LEVELS[state.levelIndex].name} — the gallery keeps its relics tonight.`;
    showScreen('over');
  } else {
    setMessage(`${guard.name} caught you! ${state.chances} getaway ${state.chances === 1 ? 'chance' : 'chances'} left.`, 3);
    loadLevel(state.levelIndex);
    for (const node of Object.values(screens)) node.classList.add('hidden');
    state.screen = 'playing';
  }
  updateHud();
}

function levelComplete() {
  const t = state.levelTime;
  const key = bestKey(state.levelIndex);
  const prev = parseFloat(localStorage.getItem(key) || 'Infinity');
  const isBest = t < prev;
  if (isBest) localStorage.setItem(key, t.toFixed(1));
  sound.winSting();
  const last = state.levelIndex === LEVELS.length - 1;
  el('win-title').textContent = last ? 'Clean Getaway!' : 'Wing Cleared!';
  el('win-stats').textContent =
    `${LEVELS[state.levelIndex].name} — ${fmtTime(t)}${isBest ? ' — new best!' : ''} — ` +
    `${state.player.relics} relics, ${state.player.pebbles} pebbles left, ${state.chances} chances left.`;
  el('btn-next').textContent = last ? 'Play again' : 'Next wing →';
  showScreen('win');
}

function update(dt) {
  if (state.screen !== 'playing') return;
  state.time += dt;
  state.levelTime += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  state.player.update(dt, input, state.world);

  // Player footsteps (soft ticks, silent while sneaking).
  if (state.player.moving && !state.player.sneaking) {
    if (state.player.stepPhase - state.lastPlayerStep > Math.PI) {
      state.lastPlayerStep = state.player.stepPhase;
      sound.playerStep(false);
    }
  }

  const events = [];
  for (const guard of state.guards) {
    guard.update(dt, state.player, events);
    // Guard footsteps: panned by relative x, louder when close.
    const prev = state.lastGuardSteps.get(guard) || 0;
    if (guard.stepPhase - prev > Math.PI) {
      state.lastGuardSteps.set(guard, guard.stepPhase);
      const dx = guard.x - state.player.x;
      const dist = Math.hypot(dx, guard.y - state.player.y);
      sound.guardStep(dx / 6, dist);
    }
  }
  for (const camera of state.cameras) camera.update(dt, state.player, state.guards, events);
  handleEvents(events);

  state.detection = Math.max(0, ...state.guards.map((g) => g.detection), ...state.cameras.map((c) => c.detection));

  // Relic pickup.
  const relic = state.player.tryPickup(state.world);
  if (relic) {
    sound.pickupChime();
    setMessage(`Relic secured! ${state.player.relics}/${state.world.relics.length}`, 2.5);
    if (state.player.relics === state.world.relics.length) {
      state.exitOpen = true;
      sound.exitOpen();
      setMessage('All relics taken — the exit is open. Go!', 3.5);
    }
  }

  // Caught?
  for (const guard of state.guards) {
    const d = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (d < CATCH_DISTANCE_TILES) {
      caughtBy(guard);
      return;
    }
  }

  // Exit.
  if (state.exitOpen && state.player.atExit(state.world)) {
    levelComplete();
    return;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  if (state.shotMode) return; // frozen deterministic frame
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
  frame.last = now;
  update(dt);
  renderer.draw(state);
  updateHud();
}

function startGame() {
  sound.ensure();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  state.chances = MAX_CHANCES;
  loadLevel(0);
  showScreen(null);
  for (const node of Object.values(screens)) node.classList.add('hidden');
  state.screen = 'playing';
  updateHud();
}

function nextLevel() {
  sound.ensure();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (state.levelIndex >= LEVELS.length - 1) {
    startGame();
    return;
  }
  loadLevel(state.levelIndex + 1);
  for (const node of Object.values(screens)) node.classList.add('hidden');
  state.screen = 'playing';
  updateHud();
}

function togglePause() {
  if (state.screen === 'playing') {
    showScreen('pause');
  } else if (state.screen === 'pause') {
    for (const node of Object.values(screens)) node.classList.add('hidden');
    state.screen = 'playing';
  }
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    sound.ensure();
    if (state.screen === 'title') startGame();
    else doThrowPebble();
    return;
  }
  if (e.code === 'Enter') {
    sound.ensure();
    if (state.screen === 'title') startGame();
    else if (state.screen === 'win') nextLevel();
    else if (state.screen === 'over') startGame();
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
    return;
  }
  if (e.code === 'KeyR') {
    if (state.screen === 'playing' || state.screen === 'pause') {
      loadLevel(state.levelIndex);
      for (const node of Object.values(screens)) node.classList.add('hidden');
      state.screen = 'playing';
    }
    return;
  }
  if (e.code === 'KeyM') {
    sound.muted = !sound.muted;
    return;
  }
  const dir = KEYMAP[e.code];
  if (dir) {
    input[dir] = true;
    sound.ensure();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.code];
  if (dir) input[dir] = false;
});

// Click the canvas to throw a pebble toward that spot.
canvas.addEventListener('click', (e) => {
  sound.ensure();
  if (state.screen !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const cx = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const cy = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  const dx = cx / TILE - state.player.x;
  const dy = cy / TILE - state.player.y;
  if (Math.hypot(dx, dy) < 0.5) return;
  state.player.facing = Math.atan2(dy, dx);
  doThrowPebble();
});

el('btn-start').addEventListener('click', startGame);
el('btn-resume').addEventListener('click', togglePause);
el('btn-restart-pause').addEventListener('click', () => {
  loadLevel(state.levelIndex);
  for (const node of Object.values(screens)) node.classList.add('hidden');
  state.screen = 'playing';
});
el('btn-next').addEventListener('click', nextLevel);
el('btn-again').addEventListener('click', startGame);

// Buttons must never keep keyboard focus: a focused Start button would
// re-fire on Space, and Space is the pebble-throw key.
for (const button of document.querySelectorAll('button')) {
  button.addEventListener('click', () => button.blur());
}

// Expose the live state for play-testing and for the screenshot runner.
window.__game = { state, input, loadLevel, startGame, doThrowPebble, LEVELS };

// Boot: title screen over level 1, or a deterministic ?shot= frame.
state.loadLevel = loadLevel;
loadLevel(0);
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  document.body.classList.add('shot');
  state.screen = 'playing';
  for (const node of Object.values(screens)) node.classList.add('hidden');
  applyShot(shot, state);
  renderer.draw(state);
  updateHud();
  window.__gameReady = true;
} else {
  showScreen('title');
  renderer.draw(state);
  updateHud();
  requestAnimationFrame(frame);
  window.__gameReady = true;
}
