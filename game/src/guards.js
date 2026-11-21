// guards.js — one job: the night watchmen. Patrol / suspicious / alert
// state machine, vision cone + line-of-sight, detection meter.
import {
  CONE_ANGLE,
  CONE_RANGE_TILES,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  DETECT_FILL_BASE,
  DETECT_FILL_CLOSE_BONUS,
  DETECT_FILL_RUNNING,
  DETECT_FILL_SNEAK,
  DETECT_FILL_DARK,
  DETECT_DECAY,
  DETECT_SUSPICIOUS_AT,
  DETECT_ALERT_AT,
  CALM_AFTER_LOS_LOST_S,
  HEDGE_HIDE_RADIUS_TILES,
  TILE,
} from './config.js';
import { hasLineOfSight, isLit, tileAt } from './levels.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', ALERT: 'alert' };

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def, world) {
    this.name = def.name;
    this.waypoints = def.waypoints;
    this.wpIndex = 0;
    this.x = def.waypoints[0][0] + 0.5;
    this.y = def.waypoints[0][1] + 0.5;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.detection = 0;
    this.waitTimer = 0;
    this.lookTimer = 0;
    this.lostSightTimer = 0;
    this.investigate = null; // {x, y} tile centre to walk to
    this.lastSeen = null;
    this.world = world;
    this.stepPhase = 0; // deterministic: animated by update(), never random
  }

  get speed() {
    if (this.state === GUARD_STATE.ALERT) return GUARD_CHASE_SPEED;
    if (this.state === GUARD_STATE.SUSPICIOUS) return GUARD_SUSPICIOUS_SPEED;
    return GUARD_PATROL_SPEED;
  }

  get coneColor() {
    if (this.state === GUARD_STATE.ALERT) return 'red';
    if (this.state === GUARD_STATE.SUSPICIOUS) return 'yellow';
    return 'green';
  }

  // Can this guard currently see the player? Returns a 0..1 visibility
  // factor (0 = unseen) that already folds in cone, range, LOS, hiding.
  visibilityOf(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE_TILES) return 0;
    const angleTo = Math.atan2(dy, dx);
    const off = Math.abs(angleDiff(angleTo, this.facing));
    if (off > CONE_ANGLE / 2) return 0;
    if (!hasLineOfSight(this.world, this.x, this.y, player.x, player.y)) return 0;
    // Hiding in a hedge: invisible unless the guard is right on top of you.
    if (tileAt(this.world, player.x, player.y) === 'H' && dist > HEDGE_HIDE_RADIUS_TILES) return 0;
    const centre = 1 - off / (CONE_ANGLE / 2); // 1 dead centre, 0 at edge
    const range = 1 - dist / CONE_RANGE_TILES;
    return 0.35 + 0.65 * Math.max(centre, range);
  }

  update(dt, player, events) {
    const vis = this.visibilityOf(player);
    if (vis > 0) {
      this.lastSeen = { x: player.x, y: player.y };
      this.lostSightTimer = 0;
      let rate = DETECT_FILL_BASE * vis;
      if (vis > 0.85) rate *= DETECT_FILL_CLOSE_BONUS;
      if (!player.sneaking) rate *= DETECT_FILL_RUNNING;
      else rate *= DETECT_FILL_SNEAK;
      if (!isLit(this.world, player.x, player.y)) rate *= DETECT_FILL_DARK;
      const before = this.detection;
      this.detection = Math.min(DETECT_ALERT_AT, this.detection + rate * dt);
      if (before < DETECT_SUSPICIOUS_AT && this.detection >= DETECT_SUSPICIOUS_AT && this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.SUSPICIOUS;
        this.investigate = { ...this.lastSeen };
        events.push({ type: 'suspicious', guard: this });
      }
      if (this.detection >= DETECT_ALERT_AT && this.state !== GUARD_STATE.ALERT) {
        this.state = GUARD_STATE.ALERT;
        events.push({ type: 'alert', guard: this });
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DECAY * dt);
      if (this.state === GUARD_STATE.ALERT) {
        this.lostSightTimer += dt;
        if (this.lostSightTimer > CALM_AFTER_LOS_LOST_S) {
          this.state = GUARD_STATE.SUSPICIOUS;
          this.investigate = this.lastSeen ? { ...this.lastSeen } : { x: this.x, y: this.y };
          this.detection = DETECT_SUSPICIOUS_AT;
          events.push({ type: 'calmed', guard: this });
        }
      } else if (this.state === GUARD_STATE.SUSPICIOUS && this.detection < DETECT_SUSPICIOUS_AT && !this.investigate) {
        this.state = GUARD_STATE.PATROL;
      }
    }

    // Movement by state.
    if (this.state === GUARD_STATE.ALERT && this.lastSeen) {
      this.moveToward(this.lastSeen.x, this.lastSeen.y, dt);
    } else if (this.state === GUARD_STATE.SUSPICIOUS && this.investigate) {
      const arrived = this.moveToward(this.investigate.x, this.investigate.y, dt);
      if (arrived) {
        this.investigate = null;
        this.lookTimer = 2; // look around for 2s, then give up
      }
    } else if (this.state === GUARD_STATE.SUSPICIOUS && this.lookTimer > 0) {
      this.lookTimer -= dt;
      this.facing += dt * 1.6; // scanning sweep
      if (this.lookTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.detection = Math.min(this.detection, DETECT_SUSPICIOUS_AT - 1);
      }
    } else if (this.state === GUARD_STATE.PATROL) {
      if (this.waitTimer > 0) {
        this.waitTimer -= dt;
      } else {
        const target = this.waypoints[this.wpIndex];
        const arrived = this.moveToward(target[0] + 0.5, target[1] + 0.5, dt);
        if (arrived) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.waitTimer = 0.6; // brief pause at each waypoint, looks around
        }
      }
    }
    this.stepPhase += dt * this.speed * 4;
  }

  // Walk toward a point; returns true when arrived (within 0.08 tiles).
  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) return true;
    const step = Math.min(dist, this.speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    // Slide along walls: try x then y separately.
    if (!this.hitsSolid(nx, this.y)) this.x = nx;
    if (!this.hitsSolid(this.x, ny)) this.y = ny;
    return false;
  }

  hitsSolid(x, y) {
    const r = 0.3;
    const corners = [
      [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    ];
    for (const [cx, cy] of corners) {
      if (tileAt(this.world, cx, cy) === '#' || tileAt(this.world, cx, cy) === 'O' || tileAt(this.world, cx, cy) === 'C') return true;
    }
    return false;
  }

  // A noise (pebble clink) within earshot pulls the guard to investigate.
  hearNoise(x, y, radius) {
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist > radius) return;
    if (this.state === GUARD_STATE.ALERT) return;
    this.state = GUARD_STATE.SUSPICIOUS;
    this.investigate = { x, y };
    this.detection = Math.max(this.detection, DETECT_SUSPICIOUS_AT);
  }
}

// A rotating security camera: fixed mount, sweeping cone. Spotting the
// player fills its own meter; a full meter raises the nearest guard.
export class Camera {
  constructor(def, world) {
    this.x = def.x + 0.5;
    this.y = def.y + 0.5;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.phase = 0;
    this.detection = 0;
    this.world = world;
  }

  get angle() {
    return this.baseAngle + Math.sin(this.phase) * this.sweep;
  }

  update(dt, player, guards, events) {
    this.phase += dt * 0.55;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    let seen = false;
    if (dist < 6) {
      const off = Math.abs(angleDiff(Math.atan2(dy, dx), this.angle));
      if (off < CONE_ANGLE / 2 && hasLineOfSight(this.world, this.x, this.y, player.x, player.y)) {
        if (!(tileAt(this.world, player.x, player.y) === 'H' && dist > HEDGE_HIDE_RADIUS_TILES)) seen = true;
      }
    }
    if (seen) {
      this.detection = Math.min(100, this.detection + 70 * dt);
      if (this.detection >= 100) {
        this.detection = 40;
        let nearest = null;
        let best = Infinity;
        for (const g of guards) {
          const d = Math.hypot(g.x - player.x, g.y - player.y);
          if (d < best) {
            best = d;
            nearest = g;
          }
        }
        if (nearest && nearest.state !== GUARD_STATE.ALERT) {
          nearest.state = GUARD_STATE.ALERT;
          nearest.detection = 100;
          nearest.lastSeen = { x: player.x, y: player.y };
          events.push({ type: 'camera-alert', guard: nearest });
        }
      }
    } else {
      this.detection = Math.max(0, this.detection - 25 * dt);
    }
  }
}

export { TILE };
