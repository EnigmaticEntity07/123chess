/**
 * sounds.js — Web Audio API sound effects for chess
 * 
 * No external audio files required — all sounds are synthesized.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail — sounds are non-critical
  }
}

// Short woody click for normal moves
export function playMoveSound() {
  playTone(800, 0.06, 'square', 0.08);
  setTimeout(() => playTone(400, 0.04, 'square', 0.05), 20);
}

// Deeper thud for captures
export function playCaptureSound() {
  playTone(300, 0.1, 'square', 0.15);
  playTone(150, 0.12, 'triangle', 0.1);
}

// Sharp ascending ping for check
export function playCheckSound() {
  playTone(880, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(1320, 0.12, 'sine', 0.1), 80);
}

// Two-tone chime for game end
export function playGameEndSound() {
  playTone(523, 0.2, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.3, 'sine', 0.1), 200);
  setTimeout(() => playTone(784, 0.4, 'sine', 0.08), 400);
}
