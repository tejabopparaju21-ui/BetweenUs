/**
 * Emergency SOS Siren & Vibration Engine for BetweenUs
 * 
 * Provides:
 * 1. High-decibel dual-tone siren alarm via Web Audio API (piercing, alternating 900Hz / 1350Hz)
 * 2. Looping HTML5 Audio siren fallback
 * 3. Continuous SOS morse vibration ([400,200,...]) to physically ring on silent/vibrate mode
 * 4. System push notification with requireInteraction: true
 * 5. Screen WakeLock API to keep the partner's screen bright and awake during the alert
 */

import { encodeWavDataUrl } from './audioNotes';

let sirenAudioCtx: AudioContext | null = null;
let sirenOsc1: OscillatorNode | null = null;
let sirenOsc2: OscillatorNode | null = null;
let sirenLfo: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenLfoGain: GainNode | null = null;
let sirenHtmlAudio: HTMLAudioElement | null = null;
let vibrationInterval: any = null;
let wakeLockSentinel: any = null;
let isSirenActive = false;

function getSirenAudioContext(): AudioContext {
  if (!sirenAudioCtx || sirenAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sirenAudioCtx = new AudioCtx();
  }
  if (sirenAudioCtx.state === 'suspended') {
    sirenAudioCtx.resume().catch(() => {});
  }
  return sirenAudioCtx;
}

/**
 * Synthesizes a standalone 2-second loud European/Emergency dual-tone siren into a WAV Data URL.
 */
function createEmergencySirenWav(): string {
  const sampleRate = 22050;
  const duration = 2.0; // 2 seconds looped
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Modulate frequency between 850 Hz and 1300 Hz at 2.5 Hz rate
    const freq = 1000 + 350 * Math.sin(2 * Math.PI * 2.5 * t);
    const phase = 2 * Math.PI * freq * t;
    // Blend square + sine for maximum speaker projection
    const s = 0.6 * Math.sin(phase) + 0.3 * (Math.sin(phase) > 0 ? 1 : -1);
    samples[i] = s * 0.9;
  }

  return encodeWavDataUrl(samples, sampleRate);
}

const emergencySirenWavDataUrl = createEmergencySirenWav();

/**
 * Starts continuous emergency siren audio and vibration.
 * Continues until stopEmergencySiren() is called.
 */
export async function startEmergencySiren(): Promise<void> {
  if (isSirenActive) return;
  isSirenActive = true;

  // 1. Web Audio API High-Volume Dual-Tone Alarm
  try {
    const ctx = getSirenAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Compressor to allow maximum output loudness without clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, now);
    compressor.knee.setValueAtTime(4, now);
    compressor.ratio.setValueAtTime(16, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.1, now);
    compressor.connect(ctx.destination);

    // Master volume gain - Max loudness
    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.85, now);
    sirenGain.connect(compressor);

    // Main Siren Oscillator 1 (Dual Tone high frequency)
    sirenOsc1 = ctx.createOscillator();
    sirenOsc1.type = 'sawtooth';
    sirenOsc1.frequency.setValueAtTime(960, now);

    // Main Siren Oscillator 2 (Harmonic richness)
    sirenOsc2 = ctx.createOscillator();
    sirenOsc2.type = 'square';
    sirenOsc2.frequency.setValueAtTime(964, now); // slight detune for piercing urgency

    // Low Frequency Oscillator (LFO) to modulate pitch up and down (wailing siren effect)
    sirenLfo = ctx.createOscillator();
    sirenLfo.type = 'sine';
    sirenLfo.frequency.setValueAtTime(2.5, now); // 2.5 sirens per second

    sirenLfoGain = ctx.createGain();
    sirenLfoGain.gain.setValueAtTime(320, now); // modulate +/- 320 Hz

    sirenLfo.connect(sirenLfoGain);
    sirenLfoGain.connect(sirenOsc1.frequency);
    sirenLfoGain.connect(sirenOsc2.frequency);

    sirenOsc1.connect(sirenGain);
    sirenOsc2.connect(sirenGain);

    sirenOsc1.start(now);
    sirenOsc2.start(now);
    sirenLfo.start(now);
  } catch (err) {
    console.warn('Web Audio siren init error, relying on HTML5 Audio fallback:', err);
  }

  // 2. HTML5 Audio looping fallback (plays via media stream)
  try {
    if (!sirenHtmlAudio) {
      sirenHtmlAudio = new Audio(emergencySirenWavDataUrl);
      sirenHtmlAudio.loop = true;
      sirenHtmlAudio.volume = 1.0;
    }
    sirenHtmlAudio.currentTime = 0;
    sirenHtmlAudio.play().catch((err) => {
      console.warn('HTML5 Audio play failed:', err);
    });
  } catch (_) {}

  // 3. Physical Phone Vibration (Morse Code SOS: ••• ——— •••)
  // Essential for ringing when partner's phone is in Silent / Vibrate mode!
  triggerContinuousVibration();

  // 4. Request Screen WakeLock so screen doesn't turn off
  try {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      (navigator as any).wakeLock
        .request('screen')
        .then((sentinel: any) => {
          wakeLockSentinel = sentinel;
        })
        .catch(() => {});
    }
  } catch (_) {}

  // 5. Native System Notification (if permitted)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 EMERGENCY SOS ALERT!', {
        body: 'Your partner has triggered an emergency alarm. Tap to open and respond immediately!',
        icon: '/pwa-192x192.png',
        tag: 'sos-partner-alert',
        requireInteraction: true,
        silent: false,
      });
    }
  } catch (_) {}
}

/**
 * Triggers continuous intense vibration pattern for phones in silent/vibrate mode
 */
function triggerContinuousVibration() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    // SOS pattern: 3 short (200ms), 3 long (500ms), 3 short (200ms) with pauses
    const sosPattern = [200, 100, 200, 100, 200, 300, 500, 150, 500, 150, 500, 300, 200, 100, 200, 100, 200, 600];

    try {
      navigator.vibrate(sosPattern);
    } catch (_) {}

    // Repeat every 4.5 seconds to maintain continuous vibration
    if (vibrationInterval) clearInterval(vibrationInterval);
    vibrationInterval = setInterval(() => {
      if (!isSirenActive) {
        clearInterval(vibrationInterval);
        return;
      }
      try {
        navigator.vibrate(sosPattern);
      } catch (_) {}
    }, 4500);
  }
}

/**
 * Stops emergency siren audio, vibration, and releases wake lock
 */
export function stopEmergencySiren(): void {
  isSirenActive = false;

  // Stop Web Audio nodes
  try {
    if (sirenOsc1) {
      sirenOsc1.stop();
      sirenOsc1.disconnect();
      sirenOsc1 = null;
    }
    if (sirenOsc2) {
      sirenOsc2.stop();
      sirenOsc2.disconnect();
      sirenOsc2 = null;
    }
    if (sirenLfo) {
      sirenLfo.stop();
      sirenLfo.disconnect();
      sirenLfo = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
    if (sirenLfoGain) {
      sirenLfoGain.disconnect();
      sirenLfoGain = null;
    }
  } catch (_) {}

  // Stop HTML5 Audio
  if (sirenHtmlAudio) {
    try {
      sirenHtmlAudio.pause();
      sirenHtmlAudio.currentTime = 0;
    } catch (_) {}
    sirenHtmlAudio = null;
  }

  // Stop Vibration
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0); // Cancel ongoing vibration
    } catch (_) {}
  }

  // Release WakeLock
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch (_) {}
    wakeLockSentinel = null;
  }
}

export function isEmergencySirenRunning(): boolean {
  return isSirenActive;
}
