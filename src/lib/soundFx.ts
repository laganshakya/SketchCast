/**
 * Native Web Audio SFX Engine for SketchCast
 * Zero external audio dependencies, zero latency, ultra-tactile sound synthesis.
 * Supports dual sound packs:
 *  - 'arcade': Crunchy 8-bit retro arcade square/sawtooth chiptune synthesis.
 *  - 'hifi': Modern minimalist, silky sine/triangle FM-style chime synthesis.
 */

export type AudioPackType = 'arcade' | 'hifi';

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;
let currentPack: AudioPackType = 'arcade';
const packChangeListeners = new Set<(pack: AudioPackType) => void>();

// Initialize preferences from localStorage
try {
  const savedMute = localStorage.getItem('sketchcast_sfx_muted');
  if (savedMute !== null) {
    isMuted = savedMute === 'true';
  }
  const savedPack = localStorage.getItem('sketchcast_audio_pack') as AudioPackType;
  if (savedPack === 'arcade' || savedPack === 'hifi') {
    currentPack = savedPack;
  }
} catch {
  // ignore
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
  try {
    localStorage.setItem('sketchcast_sfx_muted', String(muted));
  } catch {
    // ignore
  }
}

export function toggleAudioMute(): boolean {
  const next = !isMuted;
  setAudioMuted(next);
  return next;
}

export function getAudioPack(): AudioPackType {
  return currentPack;
}

export function setAudioPack(pack: AudioPackType): void {
  currentPack = pack;
  try {
    localStorage.setItem('sketchcast_audio_pack', pack);
  } catch {
    // ignore
  }
  packChangeListeners.forEach((cb) => cb(pack));
}

export function toggleAudioPack(): AudioPackType {
  const next: AudioPackType = currentPack === 'arcade' ? 'hifi' : 'arcade';
  setAudioPack(next);
  return next;
}

export function onAudioPackChange(callback: (pack: AudioPackType) => void): () => void {
  packChangeListeners.add(callback);
  return () => packChangeListeners.delete(callback);
}

let lastClickTime = 0;
let lastPopTime = 0;

/**
 * Tactile button click sound
 */
export function playClickSound(pitchFactor: number = 1.0): void {
  if (isMuted) return;
  const nowMs = Date.now();
  if (nowMs - lastClickTime < 45) return;
  lastClickTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (currentPack === 'hifi') {
      // Hi-Fi: Soft gentle wood-tap transient
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640 * pitchFactor, now);
      osc.frequency.exponentialRampToValueAtTime(240 * pitchFactor, now + 0.035);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else {
      // Arcade: Punchy mechanical 8-bit triangle click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480 * pitchFactor, now);
      osc.frequency.exponentialRampToValueAtTime(120 * pitchFactor, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Tactile bubble pop (for votes, upvotes, chips, switches)
 */
export function playPopSound(): void {
  if (isMuted) return;
  const nowMs = Date.now();
  if (nowMs - lastPopTime < 50) return;
  lastPopTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (currentPack === 'hifi') {
      // Hi-Fi: Smooth acoustic water drop chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      // Arcade: 8-bit snappy frequency sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Victory fanfare arpeggio (for correct quiz answer, podium winner)
 */
export function playSuccessFanfare(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (currentPack === 'hifi') {
      // Hi-Fi: Harmonic, warm marimba/celesta chord (F4, A4, C5, E5)
      const notes = [349.23, 440.0, 523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });
    } else {
      // Arcade: 8-bit square wave arpeggio (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Error sound for wrong answers or failed validation
 */
export function playErrorBuzz(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (currentPack === 'hifi') {
      // Hi-Fi: Soft muted low dual-tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.16);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Arcade: Cyber distorted sawtooth buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.18);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Power-up laser / chime activation sound (50/50, Freeze, Double Down)
 */
export function playPowerUpSound(_type?: string): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (currentPack === 'hifi') {
      // Hi-Fi: Shimmering crystalline chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      // Arcade: Sci-fi laser blast
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.16);
      osc.frequency.linearRampToValueAtTime(800, now + 0.24);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Urgent countdown tick sound for final 5 seconds of quiz round
 */
export function playCountdownTick(remaining: number): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (currentPack === 'hifi') {
      // Hi-Fi: Soft wooden click
      const baseFreq = remaining <= 3 ? 980 : 800;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else {
      // Arcade: High digital blip
      const baseFreq = remaining <= 3 ? 900 : 700;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Smooth swoosh for tab switches
 */
export function playWhoosh(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = currentPack === 'hifi' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // AudioContext blocked
  }
}

/**
 * Dynamic streak multiplier sound:
 * 1.5x: Ascending 3-tone arpeggio
 * 2.0x: Heroic 4-tone power synth fanfare
 */
export function playStreakMultiplierSound(multiplier: number = 1.5): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (multiplier >= 2.0) {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = currentPack === 'hifi' ? 'sine' : idx === freqs.length - 1 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        const startTime = now + idx * 0.08;
        const duration = idx === freqs.length - 1 ? 0.35 : 0.12;

        gain.gain.setValueAtTime(0.16, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } else {
      const freqs = [349.23, 440.0, 523.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = currentPack === 'hifi' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        const startTime = now + idx * 0.07;
        const duration = 0.14;

        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Grand celebratory fanfare for Masterclass Certificate unlock
 */
export function playCertificateFanfare(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [261.63, 392.0, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = currentPack === 'hifi' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      const startTime = now + idx * 0.1;
      const duration = idx === notes.length - 1 ? 0.6 : 0.22;

      gain.gain.setValueAtTime(0.17, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch {
    // AudioContext blocked
  }
}

export const playFanfare = playSuccessFanfare;
export const playClickTick = playClickSound;
export const isSoundFxMuted = isAudioMuted;
export const toggleMuteSoundFx = toggleAudioMute;
export const playStreakMultiplier = playStreakMultiplierSound;
