// Sound and haptics for the moments worth marking.
//
// Everything here is synthesised at play time through the Web Audio API.
// No sample files: nothing to license, nothing added to the bundle, and
// nothing to fetch over a school connection before a sound can play.
//
// What makes these read as instruments rather than beeps — the thing the
// previous single-oscillator version got wrong — is three properties real
// struck instruments have and a bare sine sweep doesn't:
//
//   Partials. A note is a fundamental plus quieter harmonics above it,
//   slightly detuned. One pure sine is the sound of a smoke alarm.
//
//   A percussive envelope. Near-instant attack, then exponential decay.
//   A tone that holds at constant volume and then stops reads as a machine;
//   one that blooms and falls away reads as something struck.
//
//   A moving filter. Brightness decaying faster than loudness is what wood
//   and glass do, and it's most of why something sounds physical.
//
// Intervals are from a major pentatonic, which has no semitone clashes —
// any subset of it sounds consonant, so the arpeggios can't land sour.

let audioCtx = null;
let masterGain = null;

// Deliberately quiet. This is a phone in a classroom, possibly at the back
// of one, and every sound here is incidental to something the student is
// looking at anyway.
const MASTER_VOLUME = 0.22;

function getCtx() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = MASTER_VOLUME;
  masterGain.connect(audioCtx.destination);
  return audioCtx;
}

// Browsers start an AudioContext suspended until the page has been
// interacted with. Every one of these fires from a tap, so resuming here is
// enough and there's no need for a separate unlock-on-first-touch handler.
function ready() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One struck note. `partials` are multipliers on the fundamental with their
// own relative gains — [1, 1] alone is a sine, which is why none of these
// use just that.
function note(ctx, {
  freq,
  at = 0,
  duration = 0.4,
  gain = 0.5,
  type = "sine",
  partials = [[1, 1], [2, 0.32], [3, 0.12]],
  filterFrom = 5200,
  filterTo = 900,
  detune = 6,
}) {
  const t0 = ctx.currentTime + at;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(120, filterTo), t0 + duration);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);   // attack
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration); // decay

  filter.connect(env).connect(masterGain);

  partials.forEach(([mult, level], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * mult, t0);
    // A little detune per partial stops them phase-locking into something
    // that sounds synthetic.
    osc.detune.setValueAtTime(i === 0 ? 0 : (i % 2 ? detune : -detune), t0);
    const pg = ctx.createGain();
    pg.gain.value = level;
    osc.connect(pg).connect(filter);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  });
}

// A very short filtered noise burst. Layered under a note's attack it gives
// the onset a bit of body — the difference between a tone starting and
// something actually being tapped.
function tick(ctx, { at = 0, gain = 0.16, duration = 0.045, freq = 2400 }) {
  const t0 = ctx.currentTime + at;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 1.1;

  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(bp).connect(env).connect(masterGain);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* blocked or unsupported */ }
  }
}

// Sound is opt-out (profile.soundOn === false). Haptics fire regardless:
// a short vibration has none of the cost of a sound in a quiet room, and a
// student who turned sound off in class still wants to feel the tap land.
function soundOn(profile) {
  return !(profile && profile.soundOn === false);
}

// C major pentatonic, two octaves. Index 0 is C5.
const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

// ------------------------------------------------------------ the sounds

// Logged something. A soft wooden tap — the workhorse, heard many times a
// day, so it's the shortest and plainest thing here. Anything with a
// flourish would wear out within a week.
export function celebrate(profile) {
  vibrate(10);
  if (!soundOn(profile)) return;
  const ctx = ready();
  if (!ctx) return;
  tick(ctx, { gain: 0.13, freq: 2000 });
  note(ctx, {
    freq: PENT[2], duration: 0.34, gain: 0.42,
    partials: [[1, 1], [2.01, 0.28], [3.02, 0.09]],
    filterFrom: 4200, filterTo: 700,
  });
}

// A tree reached a new growth stage. Three notes rising through the
// pentatonic, each a little quieter — a small arpeggio rather than a
// fanfare, because this happens often enough that a fanfare would grate.
export function levelUpCelebrate(profile) {
  vibrate([10, 40, 10]);
  if (!soundOn(profile)) return;
  const ctx = ready();
  if (!ctx) return;
  tick(ctx, { gain: 0.1, freq: 2600 });
  [
    { i: 2, at: 0,    g: 0.42 },
    { i: 4, at: 0.09, g: 0.36 },
    { i: 6, at: 0.18, g: 0.30 },
  ].forEach(({ i, at, g }) => {
    note(ctx, {
      freq: PENT[i], at, duration: 0.5, gain: g,
      partials: [[1, 1], [2, 0.3], [3, 0.12], [4.02, 0.05]],
      filterFrom: 6000, filterTo: 1100,
    });
  });
}

// Coins awarded. A light two-note ping, bell-ish — brighter and thinner
// than the log tap so the two don't blur together when they fire in
// sequence, which they usually do.
export function coinSound(profile) {
  if (!soundOn(profile)) return;
  const ctx = ready();
  if (!ctx) return;
  [
    { i: 5, at: 0,    g: 0.3 },
    { i: 7, at: 0.07, g: 0.24 },
  ].forEach(({ i, at, g }) => {
    note(ctx, {
      freq: PENT[i], at, duration: 0.38, gain: g,
      // Inharmonic upper partials are what make something read as metal
      // rather than wood.
      partials: [[1, 1], [2.76, 0.22], [5.4, 0.07]],
      filterFrom: 8000, filterTo: 2200,
    });
  });
}

// A badge unlocked. The biggest moment in the app and a genuinely rare one,
// so this is the only sound allowed a real flourish: four notes up the
// pentatonic with a low note underneath for weight.
export function badgeSound(profile) {
  vibrate([12, 30, 12, 30, 18]);
  if (!soundOn(profile)) return;
  const ctx = ready();
  if (!ctx) return;
  tick(ctx, { gain: 0.12, freq: 3000 });
  note(ctx, {
    freq: PENT[0] / 2, duration: 0.9, gain: 0.26,
    partials: [[1, 1], [2, 0.24], [3, 0.08]],
    filterFrom: 2400, filterTo: 400,
  });
  [0, 2, 4, 7].forEach((i, n) => {
    note(ctx, {
      freq: PENT[i + 2], at: n * 0.085, duration: 0.65, gain: 0.34 - n * 0.03,
      partials: [[1, 1], [2, 0.32], [3, 0.14], [4.01, 0.06]],
      filterFrom: 7000, filterTo: 1400,
    });
  });
}

// Something didn't work. Deliberately soft and low — a failed save is
// already annoying, and a harsh buzzer aimed at a child who mistyped their
// password makes it worse. Falls rather than rises, which is the only part
// that has to read as "no".
export function errorSound(profile) {
  vibrate([18, 50, 18]);
  if (!soundOn(profile)) return;
  const ctx = ready();
  if (!ctx) return;
  note(ctx, {
    freq: 300, duration: 0.3, gain: 0.3,
    type: "triangle",
    partials: [[1, 1], [1.5, 0.18]],
    filterFrom: 1400, filterTo: 300,
  });
  note(ctx, {
    freq: 225, at: 0.1, duration: 0.36, gain: 0.26,
    type: "triangle",
    partials: [[1, 1], [1.5, 0.16]],
    filterFrom: 1100, filterTo: 260,
  });
}
