// Tiny tactile/audio touches for the core log-something loop. No audio
// asset to ship or license — the "sound" is a couple of milliseconds of
// synthesized tone via the Web Audio API, not a sample file.
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
}

function playTone(from, to, duration) {
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) { /* ignore — Web Audio unavailable or blocked */ }
}

// A soft click for "you logged something" — sound is opt-out via
// profile.soundOn === false (on by default), haptics fire regardless since
// there's no equivalent cost to a quick vibration.
export function celebrate(profile) {
  vibrate(10);
  if (profile && profile.soundOn === false) return;
  playTone(720, 420, 0.14);
}

// A slightly bigger moment for an actual stage level-up.
export function levelUpCelebrate(profile) {
  vibrate([10, 40, 10]);
  if (profile && profile.soundOn === false) return;
  playTone(520, 880, 0.22);
}
