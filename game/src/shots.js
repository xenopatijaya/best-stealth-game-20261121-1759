// shots.js — one job: deterministic screenshot scenes for ?shot=.
// Each scene plays the REAL rules forward from a fixed setup with fixed
// positions, so the same shot name always renders the same frame.
import { GUARD_STATE } from './guards.js';

// state: the live game state object from main.js (world, player, guards,
// cameras, pebbleMarks, detection, levelIndex, ...). Scenes mutate it
// in place and set state.shotMode so main.js renders one frozen frame.
export function applyShot(name, state) {
  state.shotMode = true;
  state.time = 12.5; // fixed time so the relic pulse is identical
  state.pebbleMarks = [];
  if (name === 'cover') return shotCover(state);
  if (name === 'patrol') return shotPatrol(state);
  if (name === 'suspicion') return shotSuspicion(state);
  if (name === 'alert') return shotAlert(state);
  return shotCover(state);
}

function placeGuard(guard, x, y, facing, guardState, detection) {
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.state = guardState;
  guard.detection = detection;
  guard.investigate = null;
  guard.lookTimer = 0;
  guard.waitTimer = 0;
  guard.lastSeen = null;
  guard.stepPhase = 0; // deterministic shot frame
}

function placePlayer(player, x, y, facing, sneaking) {
  player.x = x;
  player.y = y;
  player.facing = facing;
  player.sneaking = sneaking;
  player.moving = false;
  player.hidden = false;
}

// 1-cover: hero moment. Moth crouched behind a pedestal, a guard cone
// sweeping just past, a relic glowing, the exit open and green.
function shotCover(state) {
  state.loadLevel(0);
  const [bram, ida] = state.guards;
  // Moth crouched behind the pedestal at (17, 1); the relic on the far
  // pedestal glows just past Bram's sweeping cone; the exit is green.
  placePlayer(state.player, 17.5, 2.5, Math.PI / 2, true);
  // Bram patrols the top hall; his cone sweeps just past Moth.
  placeGuard(bram, 14.5, 2.5, 0.35, GUARD_STATE.PATROL, 0);
  placeGuard(ida, 20.5, 9.5, Math.PI, GUARD_STATE.PATROL, 0);
  // All relics taken so the exit glows green; one relic left glowing
  // on its pedestal for the hero shot is faked by un-taking the far one.
  for (const relic of state.world.relics) relic.taken = true;
  state.world.relics[1].taken = false;
  state.player.relics = 2;
  state.exitOpen = true;
  state.detection = 0;
  state.message = 'Stay low. The cone is sweeping past…';
}

// 2-patrol: wide view of level 2 — every patrol route, cone and cover
// visible, Moth sneaking in from the entrance.
function shotPatrol(state) {
  state.loadLevel(1);
  const [bram, ida, sol] = state.guards;
  placePlayer(state.player, 2.5, 2.5, 0, true);
  placeGuard(bram, 3.5, 2.5, 0, GUARD_STATE.PATROL, 0);
  placeGuard(ida, 19.5, 4.5, Math.PI, GUARD_STATE.PATROL, 0);
  placeGuard(sol, 19.5, 11.5, -Math.PI / 2, GUARD_STATE.PATROL, 0);
  state.detection = 0;
  state.message = 'Three watchmen. Learn their routes, then move.';
}

// 3-suspicion: yellow cone, detection ~60%, a guard investigating the
// pebble Moth just threw.
function shotSuspicion(state) {
  state.loadLevel(0);
  const [bram, ida] = state.guards;
  placePlayer(state.player, 4.5, 9.5, 0, true);
  // Bram heard the pebble at (8.5, 9.5) and is walking to check it.
  placeGuard(bram, 6.5, 9.5, 0, GUARD_STATE.SUSPICIOUS, 60);
  bram.investigate = { x: 8.5, y: 9.5 };
  bram.lastSeen = { x: 8.5, y: 9.5 };
  placeGuard(ida, 18.5, 3.5, Math.PI, GUARD_STATE.PATROL, 0);
  state.pebbleMarks = [{ x: 8.5, y: 9.5 }];
  state.detection = 60;
  state.message = 'Heard that? Bram is coming to look…';
}

// 4-alert: red chase in the Vault Wing — a guard closing in while Moth
// sprints for cover past a sweeping camera.
function shotAlert(state) {
  state.loadLevel(2);
  const [bram, ida, sol, mara] = state.guards;
  placePlayer(state.player, 16.5, 12.5, Math.PI, false);
  placeGuard(mara, 14.5, 12.5, 0, GUARD_STATE.ALERT, 100);
  mara.lastSeen = { x: 16.5, y: 12.5 };
  placeGuard(bram, 3.5, 4.5, Math.PI / 2, GUARD_STATE.PATROL, 0);
  placeGuard(ida, 11.5, 4.5, -Math.PI / 2, GUARD_STATE.PATROL, 0);
  placeGuard(sol, 20.5, 4.5, Math.PI, GUARD_STATE.PATROL, 0);
  for (const relic of state.world.relics) relic.taken = true;
  state.player.relics = 3;
  state.exitOpen = true;
  state.detection = 100;
  state.message = 'SPOTTED! Break line of sight — now!';
}
