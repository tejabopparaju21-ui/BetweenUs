import { getAudioContext } from './audioNotes';

/**
 * Romantic Audio Engine for Video & Voice Calls in BetweenUs
 * Synthesized purely with Web Audio API - no external file dependencies.
 */

/**
 * Starts an outgoing calling ringtone loop (soft harmonic chime)
 * Returns a cancel/stop function.
 */
export function startCallingRingtone(): () => void {
  let isStopped = false;
  let timerId: number | null = null;
  const activeNodes: (OscillatorNode | GainNode)[] = [];

  const playSingleRing = () => {
    if (isStopped) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      // Soft gentle ramp in
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.08);
      // Hold
      gainNode.gain.setValueAtTime(0.08, now + 1.1);
      // Ramp out
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      gainNode.connect(ctx.destination);
      activeNodes.push(gainNode);

      // Dual tone: 440 Hz (A4) and 480 Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.45);
      osc2.stop(now + 1.45);

      activeNodes.push(osc1, osc2);

      // Clean up past nodes
      setTimeout(() => {
        try {
          gainNode.disconnect();
        } catch (_) {}
      }, 1500);
    } catch (e) {
      console.warn('Call ringtone synthesis:', e);
    }

    // Repeat every 3.2 seconds if not stopped
    if (!isStopped) {
      timerId = window.setTimeout(playSingleRing, 3200);
    }
  };

  playSingleRing();

  return () => {
    isStopped = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch (_) {}
    });
    activeNodes.length = 0;
  };
}

/**
 * Plays an upbeat harmonic chime when partner answers the call
 */
export function playCallConnectedSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });
  } catch (e) {
    console.warn('Call connected chime:', e);
  }
}

/**
 * Plays a soft descending tone when the call is ended
 */
export function playCallEndedSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const beeps = [
      { freq: 480, time: 0, dur: 0.18 },
      { freq: 360, time: 0.22, dur: 0.28 },
    ];

    beeps.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + time;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.05);
    });
  } catch (e) {
    console.warn('Call ended tone:', e);
  }
}

/**
 * Plays a cheerful sparkle chime when romantic reaction is sent during call
 */
export function playCallHeartReactionSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1318.51];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.08, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  } catch (_) {}
}
