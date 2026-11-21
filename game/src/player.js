// player.js — one job: Moth, the cat burglar. Movement, sneak, pebble
// throws, hiding state, relic pickup.
import {
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RADIUS,
  PEBBLE_RANGE_TILES,
} from './config.js';
import { tileAt, isSolidTile } from './levels.js';

export class Player {
  constructor(start) {
    this.x = start.x + 0.5;
    this.y = start.y + 0.5;
    this.facing = 0; // radians, last move direction
    this.sneaking = false;
    this.moving = false;
    this.stepPhase = 0;
    this.pebbles = 0;
    this.relics = 0;
    this.hidden = false;
  }

  get speed() {
    return this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  }

  update(dt, input, world) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = !!input.sneak;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.facing = Math.atan2(my, mx);
      const step = this.speed * dt;
      const r = PLAYER_RADIUS;
      const nx = this.x + mx * step;
      const ny = this.y + my * step;
      if (!this.collides(world, nx, this.y, r)) this.x = nx;
      if (!this.collides(world, this.x, ny, r)) this.y = ny;
      this.stepPhase += dt * this.speed * 3.2;
    }
    this.hidden = tileAt(world, this.x, this.y) === 'H';
  }

  collides(world, x, y, r) {
    for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) {
      if (isSolidTile(world, Math.floor(cx), Math.floor(cy))) return true;
    }
    return false;
  }

  // Throw a pebble toward the facing direction. Returns the landing point
  // in tile coords, or null when out of pebbles.
  throwPebble() {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const lx = this.x + Math.cos(this.facing) * PEBBLE_RANGE_TILES;
    const ly = this.y + Math.sin(this.facing) * PEBBLE_RANGE_TILES;
    return { x: lx, y: ly };
  }

  // Pick up any relic underfoot. Returns the relic taken, or null.
  tryPickup(world) {
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const dx = relic.x + 0.5 - this.x;
      const dy = relic.y + 0.5 - this.y;
      if (dx * dx + dy * dy < 0.6 * 0.6) {
        relic.taken = true;
        this.relics += 1;
        return relic;
      }
    }
    return null;
  }

  atExit(world) {
    const dx = world.exit.x + 0.5 - this.x;
    const dy = world.exit.y + 0.5 - this.y;
    return dx * dx + dy * dy < 0.7 * 0.7;
  }
}
