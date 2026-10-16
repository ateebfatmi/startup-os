"use client";

let audioCtx: AudioContext | null = null;
let lofiInterval: number | null = null;
let lofiGainNode: GainNode | null = null;
let isLofiPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

// Procedural chill lofi chord progression
const CHORDS = [
  [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
  [98.0, 174.61, 246.94, 329.63],          // G13
  [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 196.0, 261.63, 329.63],          // Am7
];

let chordIndex = 0;

export function playLofiMusic() {
  const ctx = getAudioContext();
  if (!ctx || isLofiPlaying) return;
  isLofiPlaying = true;

  lofiGainNode = ctx.createGain();
  lofiGainNode.gain.setValueAtTime(0.06, ctx.currentTime);
  lofiGainNode.connect(ctx.destination);

  const playNextChord = () => {
    if (!isLofiPlaying || !lofiGainNode || !audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = CHORDS[chordIndex % CHORDS.length];
    chordIndex++;

    notes.forEach((freq, i) => {
      if (!audioCtx || !lofiGainNode) return;
      const osc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Lowpass filter for warm analog feel
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(1.5, now);

      // Subtle vibrato
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(4.2, now);
      lfoGain.gain.setValueAtTime(1.8, now);
      lfo.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + 3.8);

      // Smooth attack and release envelope
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.35 / notes.length, now + 0.4);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.6);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(lofiGainNode);

      osc.start(now);
      osc.stop(now + 3.7);
    });
  };

  playNextChord();
  lofiInterval = window.setInterval(playNextChord, 3800);
}

export function stopLofiMusic() {
  isLofiPlaying = false;
  if (lofiInterval) {
    clearInterval(lofiInterval);
    lofiInterval = null;
  }
  if (lofiGainNode && audioCtx) {
    try {
      lofiGainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    } catch {}
    lofiGainNode = null;
  }
}

export function playCoffeeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Espresso steam hiss
  const bufferSize = ctx.sampleRate * 1.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, now);
  filter.Q.setValueAtTime(3, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 1.2);

  // Finishing drip chime
  setTimeout(() => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }, 900);
}

export function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  [523.25, 659.25, 783.99].forEach((freq, idx) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    gain.gain.setValueAtTime(0.04, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.55);
  });
}

export function playSlideClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}
