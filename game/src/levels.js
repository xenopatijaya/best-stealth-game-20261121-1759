// levels.js — one job: the three museum wings as tile maps plus the
// patrol routes, relic spots, cameras and exit for each level.
// Legend: # wall  . floor  H hedge (hide spot)  O pedestal (cover)
//         C crate (cover)  L lamp (light pool)  R relic  S player start
//         E exit  K camera mount. Maps are 26 wide x 18 tall.
export const LEVELS = [
  {
    name: 'Level 1 — The Marble Hall',
    sub: 'Two watchmen. Two relics. Learn the patrols.',
    pebbles: 3,
    map: [
      '##########################',
      '#S....H....#.....O.......#',
      '#..........#.............#',
      '#.O....R...#....H....R...#',
      '#..........#.............#',
      '#....##....#......##.....#',
      '#....##....#......##.....#',
      '#..........#.............#',
      '#.H........O.......H.....#',
      '#........................#',
      '#.....C.........C........#',
      '#........................#',
      '#.O.......#..............#',
      '#..........#.............#',
      '#....H.....#.....H....O..#',
      '#........................#',
      '#.......C.......C......E.#',
      '##########################',
    ],
    guards: [
      { name: 'Bram', waypoints: [[3, 2], [9, 2], [9, 7], [3, 7]] },
      { name: 'Ida', waypoints: [[14, 2], [23, 2], [23, 7], [14, 7]] },
    ],
    cameras: [],
    lamps: [[5, 9], [20, 9], [12, 15]],
  },
  {
    name: 'Level 2 — The Sculpture Court',
    sub: 'Three watchmen. Three relics. Mind the long hall.',
    pebbles: 4,
    map: [
      '##########################',
      '#S.....#......H.....R....#',
      '#......#.................#',
      '#.O....#...O......#......#',
      '#......#..........#..H...#',
      '#..R...#....C.....#......#',
      '#......#.................#',
      '#......O....#............#',
      '#...........#............#',
      '#....H......#............#',
      '#...........#....##......#',
      '#..C........#....##..O...#',
      '#...........#............#',
      '#.....R.....#.....H......#',
      '#...........#............#',
      '#..H....O...#....C.......#',
      '#......................E.#',
      '##########################',
    ],
    guards: [
      { name: 'Bram', waypoints: [[3, 2], [5, 2], [5, 6], [3, 6]] },
      { name: 'Ida', waypoints: [[15, 2], [23, 2], [23, 6], [15, 6]] },
      { name: 'Sol', waypoints: [[14, 9], [24, 9], [24, 14], [14, 14]] },
    ],
    cameras: [],
    lamps: [[4, 9], [20, 3], [20, 12]],
  },
  {
    name: 'Level 3 — The Vault Wing',
    sub: 'Four watchmen and two sweeping cameras. The vault relics.',
    pebbles: 4,
    map: [
      '##########################',
      '#S....#....H....#....R...#',
      '#.....#.........#........#',
      '#.O...#....O....#...H....#',
      '#.....#.........#........#',
      '#..R..#....C....#....O...#',
      '#.....#.........#........#',
      '#.....O....#.............#',
      '#..........#.............#',
      '#....H.....#......H......#',
      '#..........#.............#',
      '#..C.......#....C........#',
      '#..........#.............#',
      '#.....R....#.....O.......#',
      '#..........#.............#',
      '#..H.......#......H....O.#',
      '#.......................E#',
      '##########################',
    ],
    guards: [
      { name: 'Bram', waypoints: [[3, 2], [4, 2], [4, 6], [3, 6]] },
      { name: 'Ida', waypoints: [[8, 2], [14, 2], [14, 6], [8, 6]] },
      { name: 'Sol', waypoints: [[18, 2], [23, 2], [23, 6], [18, 6]] },
      { name: 'Mara', waypoints: [[14, 9], [23, 9], [23, 14], [14, 14]] },
    ],
    cameras: [
      { x: 12, y: 8, baseAngle: Math.PI / 2, sweep: 1.1 },
      { x: 20, y: 12, baseAngle: -Math.PI / 2, sweep: 1.3 },
    ],
    lamps: [[5, 9], [20, 9], [12, 15]],
  },
];

// Parse a level definition into a runtime world: solid grid, relic list,
// exit tile, player start tile, lamp list. Pure function, no DOM.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const relics = [];
  let start = { x: 1, y: 1 };
  let exit = { x: 24, y: 16 };
  const lamps = (def.lamps || []).map(([x, y]) => ({ x, y }));
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const t = grid[y][x];
      if (t === 'R') relics.push({ x, y, taken: false });
      if (t === 'S') start = { x, y };
      if (t === 'E') exit = { x, y };
      if (t === 'L') lamps.push({ x, y });
    }
  }
  return { def, grid, relics, start, exit, lamps };
}

export function tileAt(world, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (ty < 0 || ty >= world.grid.length) return '#';
  if (tx < 0 || tx >= world.grid[ty].length) return '#';
  return world.grid[ty][tx];
}

export function isSolidTile(world, tx, ty) {
  if (ty < 0 || ty >= world.grid.length) return true;
  if (tx < 0 || tx >= world.grid[ty].length) return true;
  const t = world.grid[ty][tx];
  return t === '#' || t === 'O' || t === 'C';
}

export function blocksSight(world, tx, ty) {
  if (ty < 0 || ty >= world.grid.length) return true;
  if (tx < 0 || tx >= world.grid[ty].length) return true;
  return world.grid[ty][tx] === '#';
}

// Bresenham line-of-sight between two tile-centre points, walls block.
export function hasLineOfSight(world, ax, ay, bx, by) {
  let x0 = Math.floor(ax);
  let y0 = Math.floor(ay);
  const x1 = Math.floor(bx);
  const y1 = Math.floor(by);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let steps = 0; steps < 200; steps++) {
    if (x0 === x1 && y0 === y1) return true;
    if (!(x0 === Math.floor(ax) && y0 === Math.floor(ay)) && blocksSight(world, x0, y0)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return true;
}

// Is the tile under (x, y) lit by a lamp? Lit tiles fill detection slower.
export function isLit(world, x, y) {
  for (const lamp of world.lamps) {
    const dx = x - (lamp.x + 0.5);
    const dy = y - (lamp.y + 0.5);
    if (dx * dx + dy * dy < 2.6 * 2.6) return true;
  }
  return false;
}
