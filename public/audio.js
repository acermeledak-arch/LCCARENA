// Audio player using assets: /correct.mp3 and /false.mp3, with Web Audio synthesizer fallback.

let audioCtx = null;
let soundEnabled = true;

try {
  const saved = localStorage.getItem('lcc_sound_enabled');
  if (saved !== null) soundEnabled = saved === 'true';
} catch { /* ignore */ }

const correctAudio = typeof Audio !== 'undefined' ? new Audio('/correct.mp3') : null;
const falseAudio = typeof Audio !== 'undefined' ? new Audio('/false.mp3') : null;

if (correctAudio) {
  correctAudio.preload = 'auto';
}
if (falseAudio) {
  falseAudio.preload = 'auto';
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  try {
    localStorage.setItem('lcc_sound_enabled', String(soundEnabled));
  } catch { /* ignore */ }
  if (soundEnabled) initAudioOnGesture();
  return soundEnabled;
}

export function initAudioOnGesture() {
  if (correctAudio) correctAudio.load();
  if (falseAudio) falseAudio.load();

  if (!audioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

if (typeof window !== 'undefined') {
  const resume = () => initAudioOnGesture();
  window.addEventListener('click', resume, { passive: true });
  window.addEventListener('touchstart', resume, { passive: true });
  window.addEventListener('keydown', resume, { passive: true });
}

function playSynthCorrect() {
  const ctx = initAudioOnGesture();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.11 },
    { freq: 659.25, time: 0.08, dur: 0.11 },
    { freq: 783.99, time: 0.16, dur: 0.13 },
    { freq: 1046.50, time: 0.24, dur: 0.38 },
  ];
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.freq, now + n.time);
    gain.gain.setValueAtTime(0.001, now + n.time);
    gain.gain.linearRampToValueAtTime(0.30, now + n.time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + n.time);
    osc.stop(now + n.time + n.dur + 0.04);
  }
}

function playSynthWrong() {
  const ctx = initAudioOnGesture();
  if (!ctx) return;
  const now = ctx.currentTime;
  const pulses = [
    { start: 0.00, dur: 0.14, f1: 155, f2: 168 },
    { start: 0.17, dur: 0.24, f1: 130, f2: 140 },
  ];
  for (const p of pulses) {
    for (const freq of [p.f1, p.f2]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + p.start);
      gain.gain.setValueAtTime(0.001, now + p.start);
      gain.gain.linearRampToValueAtTime(0.18, now + p.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + p.start);
      osc.stop(now + p.start + p.dur + 0.04);
    }
  }
}

export function playCorrectSound() {
  if (!soundEnabled) return;
  if (correctAudio) {
    try {
      correctAudio.currentTime = 0;
      const playPromise = correctAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => playSynthCorrect());
      }
      return;
    } catch {
      playSynthCorrect();
      return;
    }
  }
  playSynthCorrect();
}

export function playWrongSound() {
  if (!soundEnabled) return;
  if (falseAudio) {
    try {
      falseAudio.currentTime = 0;
      const playPromise = falseAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => playSynthWrong());
      }
      return;
    } catch {
      playSynthWrong();
      return;
    }
  }
  playSynthWrong();
}
