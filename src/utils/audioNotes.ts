/**
 * Real Human Voice Recording & Playback Engine for BetweenUs
 * 
 * Guarantees:
 * 1. 100% Real microphone voice capture using direct PCM Web Audio + WAV encoding
 * 2. Cross-platform universal playback: 16-bit PCM WAV (works in iOS Safari, Android Chrome, Mac, Windows, iframes)
 * 3. NO MUSIC OR MELODIES in voice messages - only pure, audible human speech
 * 4. AudioContext fallback decoder if HTML5 Audio element is blocked by browser policies
 * 5. Clear permission checks and speech amplitude metering
 */

// Global singletons for active voice playback
let currentAudioElement: HTMLAudioElement | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentPlayingId: string | null = null;
let currentPlaybackStopFn: (() => void) | null = null;

// Reusable AudioContext
let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/**
 * Encodes Float32Array PCM samples into a standard 16-bit uncompressed WAV Data URL.
 * Universally supported across all web browsers and mobile platforms.
 */
export function encodeWavDataUrl(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & length itself
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count (mono = 1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Downsamples Float32Array PCM samples from inputRate to outputRate (e.g. 48kHz -> 16kHz)
 * with antialiased box-filter averaging.
 */
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate >= inputRate) return buffer;
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer];
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

/**
 * Converts a base64 Data URL into an ArrayBuffer for Web Audio decoding
 */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// -------------------------------------------------------------
// REAL MICROPHONE RECORDING CONTROLLER
// -------------------------------------------------------------

export interface AudioRecordingResult {
  audioUrl: string; // Base64 Data URL (audio/wav)
  durationSec: number;
  hasAudibleSpeech: boolean;
  maxVolumeLevel: number;
}

export interface RecordingSession {
  stop: () => Promise<AudioRecordingResult>;
  cancel: () => void;
  getAudioLevel: () => number; // 0 to 1 amplitude level for live visualizer
}

/**
 * Starts real human voice microphone recording.
 * Directly captures PCM audio chunks from the microphone via AudioContext,
 * and encodes them to a universally playable 16kHz 16-bit PCM WAV.
 */
export async function startAudioRecording(): Promise<RecordingSession> {
  const startTime = Date.now();
  let isCancelled = false;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error('Your browser does not support audio recording or microphone access is restricted.');
  }

  // Request actual microphone stream
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission was denied. Please allow microphone access in your browser settings to record your voice.');
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      throw new Error('No microphone device was detected on your system. Please connect a microphone.');
    } else {
      throw new Error(err?.message || 'Unable to access your microphone.');
    }
  }

  // Setup AudioContext for raw PCM capture
  const audioCtx = getAudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const sampleRate = audioCtx.sampleRate; // usually 44100 or 48000

  // Analyser node for live volume metering
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);

  // ScriptProcessor node to capture raw PCM float samples
  const bufferSize = 4096;
  const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
  const pcmChunks: Float32Array[] = [];
  let maxVolumeEncountered = 0;

  processor.onaudioprocess = (e) => {
    if (isCancelled) return;
    const input = e.inputBuffer.getChannelData(0);
    // Copy sample array
    const copy = new Float32Array(input.length);
    copy.set(input);
    pcmChunks.push(copy);

    // Track peak volume
    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i]);
      if (abs > maxVolumeEncountered) {
        maxVolumeEncountered = abs;
      }
    }
  };

  // Mute node so microphone is NOT echoed back through user's speakers
  const muteGain = audioCtx.createGain();
  muteGain.gain.value = 0;

  source.connect(processor);
  processor.connect(muteGain);
  muteGain.connect(audioCtx.destination);

  // Real-time volume level getter
  const getAudioLevel = (): number => {
    try {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      return Math.min(1, avg / 128); // 0 to 1
    } catch (_) {
      return 0;
    }
  };

  const cleanup = () => {
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch (_) {}
    try {
      source.disconnect();
      processor.disconnect();
      muteGain.disconnect();
      analyser.disconnect();
    } catch (_) {}
  };

  const cancel = () => {
    isCancelled = true;
    cleanup();
  };

  const stop = async (): Promise<AudioRecordingResult> => {
    const elapsedMs = Date.now() - startTime;
    const durationSec = Math.max(1, Math.round(elapsedMs / 1000));

    cleanup();

    if (isCancelled) {
      throw new Error('Recording was cancelled');
    }

    // Concatenate all PCM chunks
    let totalSamples = 0;
    for (const chunk of pcmChunks) {
      totalSamples += chunk.length;
    }

    if (totalSamples === 0) {
      throw new Error('No audio was captured. Please speak into your microphone and try again.');
    }

    const mergedSamples = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of pcmChunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16,000 Hz for optimal voice clarity and compact size
    const targetSampleRate = 16000;
    const downsampled = downsampleBuffer(mergedSamples, sampleRate, targetSampleRate);

    // Encode to 16-bit PCM WAV Data URL
    const wavDataUrl = encodeWavDataUrl(downsampled, targetSampleRate);

    const hasAudibleSpeech = maxVolumeEncountered > 0.02;

    return {
      audioUrl: wavDataUrl,
      durationSec,
      hasAudibleSpeech,
      maxVolumeLevel: maxVolumeEncountered,
    };
  };

  return {
    stop,
    cancel,
    getAudioLevel,
  };
}

// -------------------------------------------------------------
// VOICE NOTE PLAYBACK ENGINE (NO MUSIC, ONLY REAL VOICE)
// -------------------------------------------------------------

/**
 * Universal voice note audio player.
 * Plays the actual recorded human speech.
 * NO MUSIC, NO MELODIES, NO ARBITRARY CHIMES.
 */
export function playVoiceMessage({
  messageId,
  audioUrl,
  durationSec,
  onProgress,
  onEnded,
}: {
  messageId: string;
  audioUrl?: string;
  durationSec?: number;
  onProgress?: (currentTime: number, progressPct: number) => void;
  onEnded?: () => void;
}): { stop: () => void } {
  // Stop whatever is currently playing
  stopActiveVoicePlayback();
  currentPlayingId = messageId;

  const duration = Math.max(1, durationSec || 3);

  const finishPlayback = () => {
    stopActiveVoicePlayback();
    if (onEnded) onEnded();
  };

  // If no audio URL exists (e.g., from old broken message), do NOT play music!
  if (!audioUrl || (!audioUrl.startsWith('data:audio') && !audioUrl.startsWith('http') && !audioUrl.startsWith('blob:'))) {
    console.warn(`Voice message ${messageId} has no recorded audio data.`);
    finishPlayback();
    return { stop: () => stopActiveVoicePlayback() };
  }

  // Primary Player: HTMLAudioElement
  try {
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    currentAudioElement = audio;

    audio.ontimeupdate = () => {
      const cur = audio.currentTime;
      const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)
        ? audio.duration
        : duration;
      const pct = Math.min(100, (cur / dur) * 100);
      if (onProgress) onProgress(cur, pct);
    };

    audio.onended = finishPlayback;

    audio.onerror = () => {
      console.warn('HTMLAudioElement decode failed, trying Web Audio API buffer playback...');
      currentAudioElement = null;
      // Fallback: decode PCM data directly in AudioContext
      playViaWebAudio(audioUrl, duration, onProgress, finishPlayback);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('HTMLAudioElement play() error, trying Web Audio API:', err);
        currentAudioElement = null;
        playViaWebAudio(audioUrl, duration, onProgress, finishPlayback);
      });
    }

    return {
      stop: () => stopActiveVoicePlayback(),
    };
  } catch (err) {
    console.warn('Audio element initialization failed, using Web Audio API:', err);
    playViaWebAudio(audioUrl, duration, onProgress, finishPlayback);
    return {
      stop: () => stopActiveVoicePlayback(),
    };
  }
}

/**
 * Secondary playback path using Web Audio API AudioBufferSourceNode.
 * Plays the exact recorded voice if HTMLAudioElement fails.
 */
async function playViaWebAudio(
  audioUrl: string,
  durationSec: number,
  onProgress?: (currentTime: number, progressPct: number) => void,
  onEnded?: () => void
): Promise<void> {
  try {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const arrayBuffer = dataUrlToArrayBuffer(audioUrl);
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    currentBufferSource = source;

    const actualDuration = audioBuffer.duration || durationSec;
    const startTime = audioCtx.currentTime;
    let animId: number | null = null;
    let isCancelled = false;

    const progressLoop = () => {
      if (isCancelled) return;
      const elapsed = audioCtx.currentTime - startTime;
      const pct = Math.min(100, (elapsed / actualDuration) * 100);
      if (onProgress) onProgress(Math.min(elapsed, actualDuration), pct);

      if (elapsed < actualDuration) {
        animId = requestAnimationFrame(progressLoop);
      }
    };
    animId = requestAnimationFrame(progressLoop);

    source.onended = () => {
      if (animId) cancelAnimationFrame(animId);
      currentBufferSource = null;
      currentPlaybackStopFn = null;
      if (onEnded) onEnded();
    };

    currentPlaybackStopFn = () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      try {
        source.stop();
      } catch (_) {}
      currentBufferSource = null;
    };

    source.start();
  } catch (decodeErr) {
    console.error('Failed to decode and play voice audio via Web Audio:', decodeErr);
    if (onEnded) onEnded();
  }
}

/**
 * Stops any actively playing voice note
 */
export function stopActiveVoicePlayback(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.onended = null;
      currentAudioElement.ontimeupdate = null;
      currentAudioElement.onerror = null;
    } catch (_) {}
    currentAudioElement = null;
  }

  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
    } catch (_) {}
    currentBufferSource = null;
  }

  if (currentPlaybackStopFn) {
    try {
      currentPlaybackStopFn();
    } catch (_) {}
    currentPlaybackStopFn = null;
  }

  currentPlayingId = null;
}

export function getCurrentPlayingMessageId(): string | null {
  return currentPlayingId;
}

// -------------------------------------------------------------
// LOVE TAP & SONG UTILITIES
// -------------------------------------------------------------

/**
 * Synthesizes a real-time quick 0.3s romantic chime for Love Tap button
 */
export function playLoveTapChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.debug('Love tap sound notice:', err);
  }
}

/**
 * Synthesizes a soothing acoustic song preview for shared couple songs in Connect tab
 */
export function playSongMelody(durationSec: number = 10, onEnded?: () => void): () => void {
  stopActiveVoicePlayback();
  const duration = Math.max(3, durationSec);
  let isStopped = false;
  let animId: number | null = null;
  const startTime = Date.now();

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.connect(ctx.destination);

    const notes = [
      { freq: 440.0, time: 0, dur: 0.6 },
      { freq: 554.37, time: 0.5, dur: 0.7 },
      { freq: 659.25, time: 1.0, dur: 0.8 },
      { freq: 880.0, time: 1.6, dur: 1.0 },
      { freq: 740.0, time: 2.4, dur: 0.7 },
      { freq: 659.25, time: 3.0, dur: 0.9 },
      { freq: 554.37, time: 3.8, dur: 1.2 },
    ];

    const oscillators: OscillatorNode[] = [];

    notes.forEach((note) => {
      if (note.time < duration) {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(note.freq, now + note.time);

        noteGain.gain.setValueAtTime(0.0001, now + note.time);
        noteGain.gain.linearRampToValueAtTime(0.2, now + note.time + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

        noteOsc.connect(noteGain);
        noteGain.connect(masterGain);

        noteOsc.start(now + note.time);
        noteOsc.stop(now + note.time + note.dur + 0.05);
        oscillators.push(noteOsc);
      }
    });

    const updateLoop = () => {
      if (isStopped) return;
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= duration) {
        stopFn();
        if (onEnded) onEnded();
      } else {
        animId = requestAnimationFrame(updateLoop);
      }
    };
    animId = requestAnimationFrame(updateLoop);

    const stopFn = () => {
      if (isStopped) return;
      isStopped = true;
      if (animId) cancelAnimationFrame(animId);
      try {
        masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        setTimeout(() => {
          try {
            masterGain.disconnect();
            oscillators.forEach((o) => {
              try {
                o.stop();
              } catch (_) {}
            });
          } catch (_) {}
        }, 60);
      } catch (_) {}
    };

    return stopFn;
  } catch (_) {
    if (onEnded) onEnded();
    return () => {};
  }
}
