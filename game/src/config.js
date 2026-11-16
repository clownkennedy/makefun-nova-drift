// NOVA DRIFT — tuning. All distances in CSS pixels, all times in seconds.
// The star sits near the centre; the ship orbits it. Gravity is inverse-square
// with a floor so the pull stays fair close to the corona.
export const CONFIG = {
  // Star
  starRadius: 54, // solid core radius; the corona (death zone) extends a bit further
  coronaRadius: 78, // touching this kills the ship
  starX: 0.5, // fraction of width
  starY: 0.46, // fraction of height

  // Ship
  shipRadius: 11,
  thrust: 340, // px/s^2
  maxSpeed: 420,
  brake: 0.86, // per-second velocity retention while braking (strong)
  drag: 0.12, // gentle exponential drag per second
  respawnInvuln: 2.5, // seconds of protection after a respawn

  // Gravity
  gravity: 52000, // GM constant; accel = GM / max(d, 90)^2
  gravityMinDist: 90,

  // World bounds: leaving this ellipse around the star means "lost in the dark"
  escapeRadius: 560, // px from the star centre (scaled by min(w,h) below)

  // Orbs
  orbRadius: 10,
  orbsTarget: 5, // orbs kept on the field
  orbValue: 10,
  novaOrbValue: 50,
  novaOrbChance: 0.14, // chance a fresh spawn is golden
  comboWindow: 4, // seconds to keep the combo alive

  // Asteroids
  asteroidBase: 4, // count at level 1
  asteroidPerLevel: 2,
  asteroidMax: 16,
  asteroidSpeedMin: 26,
  asteroidSpeedMax: 64,
  asteroidRadiusMin: 14,
  asteroidRadiusMax: 34,

  // Levels
  orbsPerLevel: 8, // orbs collected to level up
  winLevel: 5, // reaching this charts the star: victory banner, endless mode after

  // Lives / pacing
  lives: 3,
  shakeOnDeath: 14,
  shakeDecay: 26,

  // Rendering
  starfieldStars: 170,
  nebulaBlobs: 7,
  maxParticles: 420,
};
