// render.js — one job: draw the museum on the canvas. Floor, walls,
// cover, vision cones, lighting (darkness with light holes around the
// player and the lamps), guards, player, relics and exit.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, CONE_ANGLE, CONE_RANGE_TILES, PLAYER_LIGHT_RADIUS_TILES, LAMP_LIGHT_RADIUS_TILES, DARKNESS_ALPHA } from './config.js';
import { tileAt } from './levels.js';

const CONE_FILL = {
  green: 'rgba(80, 220, 120, 0.20)',
  yellow: 'rgba(240, 200, 60, 0.30)',
  red: 'rgba(240, 60, 50, 0.38)',
};
const CONE_EDGE = {
  green: 'rgba(80, 220, 120, 0.55)',
  yellow: 'rgba(240, 200, 60, 0.75)',
  red: 'rgba(240, 60, 50, 0.85)',
};

function tileShade(x, y) {
  // Deterministic marble variation from tile coords alone.
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return h % 3;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = VIEW_W;
  dark.height = VIEW_H;
  const dctx = dark.getContext('2d');

  function drawFloor(world) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const shade = tileShade(x, y);
        if (t === '#') {
          ctx.fillStyle = '#2a2438';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#3d3550';
          ctx.fillRect(px, py, TILE, 6);
          ctx.fillStyle = '#1d1828';
          ctx.fillRect(px, py + TILE - 4, TILE, 4);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#b8a888' : '#ac9c7c';
          if (shade === 1) ctx.fillStyle = '#b09e82';
          if (shade === 2) ctx.fillStyle = '#bfae8e';
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = 'rgba(60, 45, 30, 0.25)';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        }
      }
    }
  }

  function drawProps(world, time) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.grid[y][x];
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        if (t === 'H') {
          ctx.fillStyle = '#2d5a2e';
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 4, 13, 0, Math.PI * 2);
          ctx.arc(cx + 8, cy + 2, 12, 0, Math.PI * 2);
          ctx.arc(cx, cy + 8, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3f7a3a';
          ctx.beginPath();
          ctx.arc(cx - 4, cy - 6, 7, 0, Math.PI * 2);
          ctx.arc(cx + 7, cy - 1, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === 'O') {
          ctx.fillStyle = '#6d6a72';
          ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
          ctx.fillStyle = '#8d8a96';
          ctx.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, 6);
          ctx.strokeStyle = '#3c3944';
          ctx.strokeRect(x * TILE + 6.5, y * TILE + 6.5, TILE - 13, TILE - 13);
        } else if (t === 'C') {
          ctx.fillStyle = '#7a5a34';
          ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = '#4e3a20';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * TILE + 4.5, y * TILE + 4.5, TILE - 9, TILE - 9);
          ctx.beginPath();
          ctx.moveTo(x * TILE + 4, y * TILE + 4);
          ctx.lineTo(x * TILE + TILE - 4, y * TILE + TILE - 4);
          ctx.moveTo(x * TILE + TILE - 4, y * TILE + 4);
          ctx.lineTo(x * TILE + 4, y * TILE + TILE - 4);
          ctx.stroke();
          ctx.lineWidth = 1;
        } else if (t === 'L') {
          ctx.fillStyle = '#4a4030';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd977';
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Relics glow on their pedestals — drawn after the darkness overlay
    // (see drawRelics) so their gold shine cuts through the dark.
  }

  function drawRelics(world, time) {
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const cx = relic.x * TILE + TILE / 2;
      const cy = relic.y * TILE + TILE / 2;
      const pulse = 0.6 + 0.4 * Math.sin(time * 3 + relic.x);
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
      glow.addColorStop(0, `rgba(255, 215, 90, ${0.75 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 215, 90, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 26, cy - 26, 52, 52);
      ctx.fillStyle = '#ffd75a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c0';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 3, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawExit(world, exitOpen, time) {
    const ex = world.exit.x * TILE;
    const ey = world.exit.y * TILE;
    const glow = exitOpen ? 0.55 + 0.35 * Math.sin(time * 4) : 0;
    ctx.fillStyle = exitOpen ? '#12351c' : '#33161a';
    ctx.fillRect(ex, ey, TILE, TILE);
    ctx.strokeStyle = exitOpen ? '#39d353' : '#a33';
    ctx.lineWidth = 3;
    ctx.strokeRect(ex + 2, ey + 2, TILE - 4, TILE - 4);
    ctx.lineWidth = 1;
    if (exitOpen) {
      const g = ctx.createRadialGradient(ex + 20, ey + 20, 2, ex + 20, ey + 20, 34);
      g.addColorStop(0, `rgba(57, 211, 83, ${glow})`);
      g.addColorStop(1, 'rgba(57, 211, 83, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 14, ey - 14, TILE + 28, TILE + 28);
      ctx.fillStyle = '#39d353';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', ex + 20, ey + 24);
    } else {
      ctx.fillStyle = '#c66';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOCKED', ex + 20, ey + 24);
    }
  }

  function drawCone(x, y, angle, rangeTiles, color) {
    const px = x * TILE;
    const py = y * TILE;
    const range = rangeTiles * TILE;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, range, angle - CONE_ANGLE / 2, angle + CONE_ANGLE / 2);
    ctx.closePath();
    ctx.fillStyle = CONE_FILL[color];
    ctx.fill();
    ctx.strokeStyle = CONE_EDGE[color];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawGuard(guard, time) {
    const px = guard.x * TILE;
    const py = guard.y * TILE;
    // Body: light uniform, clearly visible against the dark floor.
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath();
    ctx.arc(px, py, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a5348';
    ctx.stroke();
    // Cap.
    ctx.fillStyle = '#2b3a67';
    ctx.beginPath();
    ctx.arc(px, py - 2, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(px - 9, py - 4, 18, 3);
    // Facing tick + torch dot.
    const fx = px + Math.cos(guard.facing) * 15;
    const fy = py + Math.sin(guard.facing) * 15;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Walking bob.
    const bob = Math.sin(guard.stepPhase) * 1.5;
    ctx.fillStyle = '#2b3a67';
    ctx.fillRect(px - 8, py + 8 + bob, 5, 4);
    ctx.fillRect(px + 3, py + 8 - bob, 5, 4);
    // Name + state mark.
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(guard.name.toUpperCase(), px, py - 20);
    if (guard.state === 'suspicious') {
      ctx.fillStyle = '#f0c83c';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('?', px, py - 32);
    } else if (guard.state === 'alert') {
      ctx.fillStyle = '#f03c32';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('!', px, py - 32);
    }
    // Detection arc above the guard.
    if (guard.detection > 1) {
      ctx.beginPath();
      ctx.arc(px, py - 14, 11, -Math.PI / 2, -Math.PI / 2 + (guard.detection / 100) * Math.PI * 2);
      ctx.strokeStyle = guard.detection >= 100 ? '#f03c32' : guard.detection >= 30 ? '#f0c83c' : '#7ee787';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  function drawCamera(camera) {
    const px = camera.x * TILE;
    const py = camera.y * TILE;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = camera.detection > 50 ? '#f03c32' : '#c8c8c8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    const lx = px + Math.cos(camera.angle) * 11;
    const ly = py + Math.sin(camera.angle) * 11;
    ctx.fillStyle = camera.detection > 50 ? '#ff4444' : '#ffdd55';
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(player) {
    const px = player.x * TILE;
    const py = player.y * TILE;
    const crouch = player.sneaking ? 0.8 : 1;
    // Lantern glow.
    const glow = ctx.createRadialGradient(px, py, 4, px, py, 46);
    glow.addColorStop(0, 'rgba(255, 220, 130, 0.35)');
    glow.addColorStop(1, 'rgba(255, 220, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - 46, py - 46, 92, 92);
    // Hooded dark cloak.
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath();
    ctx.moveTo(px, py - 14 * crouch);
    ctx.lineTo(px + 11, py + 10);
    ctx.lineTo(px - 11, py + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3d3a52';
    ctx.stroke();
    // Hood + face shadow.
    ctx.fillStyle = '#2a2838';
    ctx.beginPath();
    ctx.arc(px, py - 6 * crouch, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(px + Math.cos(player.facing) * 3, py - 6 * crouch + Math.sin(player.facing) * 2, 2, 0, Math.PI * 2);
    ctx.fill();
    if (player.hidden) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#bfe8a8';
      ctx.fillText('HIDDEN', px, py - 20);
    }
  }

  function drawLighting(world, player) {
    dctx.clearRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = `rgba(4, 4, 16, ${DARKNESS_ALPHA})`;
    dctx.fillRect(0, 0, VIEW_W, VIEW_H);
    dctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r) => {
      const g = dctx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    };
    punch(player.x * TILE, player.y * TILE, PLAYER_LIGHT_RADIUS_TILES * TILE);
    for (const lamp of world.lamps) {
      punch((lamp.x + 0.5) * TILE, (lamp.y + 0.5) * TILE, LAMP_LIGHT_RADIUS_TILES * TILE);
    }
    // Exit glows through the dark when open.
    ctx.drawImage(dark, 0, 0);
  }

  function draw(state) {
    const { world, player, guards, cameras, time, exitOpen, pebbleMarks } = state;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawFloor(world);
    // Vision cones first so walls and figures draw over them.
    for (const guard of guards) drawCone(guard.x, guard.y, guard.facing, CONE_RANGE_TILES, guard.coneColor);
    for (const camera of cameras || []) {
      drawCone(camera.x, camera.y, camera.angle, 6, camera.detection > 50 ? 'red' : 'yellow');
    }
    drawProps(world, time);
    drawExit(world, exitOpen, time);
    // Pebble landing marks.
    ctx.fillStyle = '#888';
    for (const mark of pebbleMarks || []) {
      const px = mark.x * TILE;
      const py = mark.y * TILE;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const camera of cameras || []) drawCamera(camera);
    for (const guard of guards) drawGuard(guard, time);
    drawPlayer(player);
    drawLighting(world, player);
    drawRelics(world, time);
  }

  return { draw, ctx };
}

export { TILE, VIEW_W, VIEW_H };
