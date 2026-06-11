/**
 * Tiny synthesized sound effects via WebAudio — no audio assets.
 * Every call is safe to make before user interaction (it just no-ops
 * until the AudioContext is allowed to start).
 */

const MUTE_KEY = 'velocitype-muted';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* ignore */
}

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  endFreq?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

function tone({ freq, endFreq, duration, type = 'sine', volume = 0.05, delay = 0 }: ToneOpts) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration: number, volume = 0.06, delay = 0, lowpass = 800) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.ceil(a.sampleRate * duration);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = a.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  get muted() {
    return muted;
  },
  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      /* ignore */
    }
  },

  /* UI */
  select() {
    tone({ freq: 520, endFreq: 740, duration: 0.09, type: 'triangle', volume: 0.04 });
  },

  /* Race */
  countdown() {
    tone({ freq: 440, duration: 0.12, type: 'square', volume: 0.035 });
  },
  go() {
    tone({ freq: 660, endFreq: 880, duration: 0.25, type: 'square', volume: 0.045 });
  },
  boost() {
    tone({ freq: 600, endFreq: 1100, duration: 0.12, type: 'triangle', volume: 0.04 });
  },
  engineStall() {
    tone({ freq: 220, endFreq: 50, duration: 0.8, type: 'sawtooth', volume: 0.05 });
  },

  /* Typing */
  error() {
    tone({ freq: 140, endFreq: 90, duration: 0.12, type: 'square', volume: 0.045 });
  },

  /* Boss */
  bossHit() {
    tone({ freq: 900, endFreq: 180, duration: 0.14, type: 'sawtooth', volume: 0.05 });
    noise(0.1, 0.03, 0, 2400);
  },
  hurt() {
    tone({ freq: 75, endFreq: 38, duration: 0.45, type: 'sine', volume: 0.12 });
    noise(0.25, 0.08, 0, 500);
  },
  heartbeat() {
    tone({ freq: 58, duration: 0.1, type: 'sine', volume: 0.09 });
    tone({ freq: 52, duration: 0.12, type: 'sine', volume: 0.07, delay: 0.16 });
  },

  /* Outcomes */
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.22, type: 'triangle', volume: 0.045, delay: i * 0.09 }),
    );
  },
  lose() {
    [330, 277, 220, 165].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: 'triangle', volume: 0.05, delay: i * 0.14 }),
    );
  },
};
