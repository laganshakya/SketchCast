/**
 * Sound FX Engine - Disabled
 * All audio playback, Web Audio synthesis, and audio contexts have been completely removed.
 * Lightweight no-op stubs are retained for API compatibility across components.
 */

export type AudioPackType = 'arcade' | 'hifi';

export function isAudioMuted(): boolean {
  return true;
}

export function setAudioMuted(_muted: boolean): void {}

export function toggleAudioMute(): boolean {
  return true;
}

export function getAudioPack(): AudioPackType {
  return 'arcade';
}

export function setAudioPack(_pack: AudioPackType): void {}

export function toggleAudioPack(): AudioPackType {
  return 'arcade';
}

export function onAudioPackChange(_callback: (pack: AudioPackType) => void): () => void {
  return () => {};
}

export function playClickSound(_pitchFactor: number = 1.0): void {}

export function playPopSound(): void {}

export function playSuccessFanfare(): void {}

export function playErrorBuzz(): void {}

export function playPowerUpSound(_type?: string): void {}

export function playCountdownTick(_remaining: number): void {}

export function playWhoosh(): void {}

export function playStreakMultiplierSound(_multiplier: number = 1.5): void {}

export function playCertificateFanfare(): void {}

export const playFanfare = playSuccessFanfare;
export const playClickTick = playClickSound;
export const isSoundFxMuted = isAudioMuted;
export const toggleMuteSoundFx = toggleAudioMute;
export const playStreakMultiplier = playStreakMultiplierSound;
