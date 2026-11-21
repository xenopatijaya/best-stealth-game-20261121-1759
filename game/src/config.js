// config.js — every tuning number for Gallery After Dark lives here.
// One job: constants. Nothing else reads the DOM or the game state.
export const TILE = 40;
export const COLS = 26;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1040
export const VIEW_H = ROWS * TILE; // 720

export const PLAYER_WALK_SPEED = 3.4; // tiles per second
export const PLAYER_SNEAK_SPEED = 1.7;
export const PLAYER_RADIUS = 0.32; // tiles

export const GUARD_PATROL_SPEED = 1.5; // tiles per second
export const GUARD_SUSPICIOUS_SPEED = 2.1;
export const GUARD_CHASE_SPEED = 2.6; // +40% over patrol, roughly
export const GUARD_RADIUS = 0.34;

export const CONE_ANGLE = (110 * Math.PI) / 180;
export const CONE_RANGE_TILES = 6.5;
export const CATCH_DISTANCE_TILES = 0.55;
export const HEDGE_HIDE_RADIUS_TILES = 1.5;

export const DETECT_FILL_BASE = 55; // per second at point blank, centre of cone
export const DETECT_FILL_CLOSE_BONUS = 1.5; // centre of cone
export const DETECT_FILL_RUNNING = 1.6;
export const DETECT_FILL_SNEAK = 0.55;
export const DETECT_FILL_DARK = 0.5; // unlit tile
export const DETECT_DECAY = 18; // per second while unseen
export const DETECT_SUSPICIOUS_AT = 30;
export const DETECT_ALERT_AT = 100;
export const CALM_AFTER_LOS_LOST_S = 4;

export const PEBBLE_RANGE_TILES = 4.5;
export const PEBBLE_HEAR_RADIUS_TILES = 8;
export const PEBBLES_PER_LEVEL = [3, 4, 4];

export const MAX_CHANCES = 3; // getaway chances per run
export const CAMERA_SWEEP_SPEED = 0.55; // radians per second
export const CAMERA_RANGE_TILES = 6;

export const DARKNESS_ALPHA = 0.55; // how dark unlit areas are
export const PLAYER_LIGHT_RADIUS_TILES = 3.2;
export const LAMP_LIGHT_RADIUS_TILES = 2.6;
