import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Minimize2,
  Maximize2,
  Heart,
  Sparkles,
  ShieldCheck,
  Wifi,
  AlertCircle,
} from 'lucide-react';
import {
  startCallingRingtone,
  startIncomingRingtone,
  playCallConnectedSound,
  playCallEndedSound,
  playCallHeartReactionSound,
} from '../utils/callAudio';
import { getAudioContext } from '../utils/audioNotes';
import { formatISTTime } from '../utils/indianCities';
import { getCallDeviceSessionId, resolveCallRole, isCallStale } from '../utils/callSessionHelper';

interface FloatingHeart {
  id: number;
  emoji: string;
  left: number; // percentage
  size: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

/**
 * Resilient media acquisition for Voice and Video calls with hierarchical fallbacks
 * and accurate error diagnostics.
 */
async function acquireCallMedia(
  mode: 'voice' | 'video',
  facingMode: 'user' | 'environment'
): Promise<{
  stream: MediaStream;
  hasAudio: boolean;
  hasVideo: boolean;
  notice: string | null;
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return {
      stream: new MediaStream(),
      hasAudio: false,
      hasVideo: false,
      notice: 'Media access requires a secure connection (HTTPS) in your browser.',
    };
  }

  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // 1. Voice Call Mode: Audio only
  if (mode === 'voice') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      return { stream, hasAudio: true, hasVideo: false, notice: null };
    } catch (err: any) {
      console.warn('Voice constraint failed, attempting simple audio:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return { stream, hasAudio: true, hasVideo: false, notice: null };
      } catch (audioErr: any) {
        console.warn('Microphone permission/access error:', audioErr);
        let notice = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
        if (audioErr.name === 'NotFoundError' || audioErr.name === 'DevicesNotFoundError') {
          notice = 'No microphone was found on this device.';
        } else if (audioErr.name === 'NotReadableError' || audioErr.name === 'TrackStartError') {
          notice = 'Microphone is currently in use by another application or call.';
        }
        return { stream: new MediaStream(), hasAudio: false, hasVideo: false, notice };
      }
    }
  }

  // 2. Video Call Mode: Try combined audio + flexible video constraints
  const flexibleVideoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  try {
    const combinedStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: flexibleVideoConstraints,
    });
    return { stream: combinedStream, hasAudio: true, hasVideo: true, notice: null };
  } catch (err1: any) {
    console.warn('Combined flexible constraints failed, trying basic audio+video:', err1);
  }

  try {
    const basicCombined = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    return { stream: basicCombined, hasAudio: true, hasVideo: true, notice: null };
  } catch (err2: any) {
    console.warn('Basic combined failed, acquiring audio and video independently:', err2);
  }

  // 3. Acquire audio first so voice connection is always preserved
  let audioStream: MediaStream | null = null;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
  } catch (_) {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (aErr) {
      console.warn('Audio capture failed during split attempt:', aErr);
    }
  }

  // 4. Attempt video track separately
  let videoStream: MediaStream | null = null;
  let videoNotice: string | null = null;
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (vErr1: any) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (vErr2: any) {
      console.warn('Video track acquisition failed:', vErr2);
      if (vErr2.name === 'NotAllowedError' || vErr2.name === 'PermissionDeniedError') {
        videoNotice = 'Camera permission blocked. Continuing in romantic voice/avatar mode.';
      } else if (vErr2.name === 'NotReadableError' || vErr2.name === 'TrackStartError') {
        videoNotice = 'Camera is in use by another app. Continuing in romantic voice/avatar mode.';
      } else if (vErr2.name === 'NotFoundError' || vErr2.name === 'DevicesNotFoundError') {
        videoNotice = 'No camera found on this device. Continuing in romantic voice/avatar mode.';
      } else {
        videoNotice = 'Camera access unavailable. Continuing in romantic voice/avatar mode.';
      }
    }
  }

  const finalStream = new MediaStream();
  if (audioStream) {
    audioStream.getAudioTracks().forEach((t) => finalStream.addTrack(t));
  }
  if (videoStream) {
    videoStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));
  }

  const hasAudio = finalStream.getAudioTracks().length > 0;
  const hasVideo = finalStream.getVideoTracks().length > 0;

  if (!hasAudio && !hasVideo) {
    return {
      stream: finalStream,
      hasAudio: false,
      hasVideo: false,
      notice: 'Camera and microphone access could not be acquired. Please check browser permissions.',
    };
  }

  return {
    stream: finalStream,
    hasAudio,
    hasVideo,
    notice: videoNotice,
  };
}

export const CallModal: React.FC = () => {
  const {
    activeCall,
    currentUser,
    partnerUser,
    acceptIncomingCall,
    declineIncomingCall,
    endActiveCall,
    updateCallSession,
    sendCallReaction,
  } = useApp();

  const [durationSec, setDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSwappedViews, setIsSwappedViews] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [micAudioLevel, setMicAudioLevel] = useState(0.2);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ringtoneStopperRef = useRef<(() => void) | null>(null);
  const audioMeterRef = useRef<{ animId: number; analyser: AnalyserNode; source: MediaStreamAudioSourceNode } | null>(null);
  const lastProcessedReactionRef = useRef<number>(0);
  const offerCreatedRef = useRef<boolean>(false);
  const answerCreatedRef = useRef<boolean>(false);
  const localCandidatesRef = useRef<string[]>([]);
  const pendingCandidatesRef = useRef<string[]>([]);
  const candidateFlushTimeoutRef = useRef<any>(null);
  const queuedRemoteCandidatesRef = useRef<string[]>([]);
  const appliedCandidatesRef = useRef<Set<string>>(new Set());

  const mySessionId = useMemo(() => getCallDeviceSessionId(), []);
  const myUid = currentUser?.id || '';

  // 100% reliable 2-device role resolution:
  const { isCaller, isRecipient } = useMemo(() => {
    return resolveCallRole(activeCall, myUid, mySessionId);
  }, [activeCall, myUid, mySessionId]);

  const mode = activeCall?.mode || 'voice';
  const status = activeCall?.status || 'ended';

  // Safeguard: Automatically dismiss unanswered ringing calls after 45s timeout
  useEffect(() => {
    if (activeCall && activeCall.status === 'ringing' && isCallStale(activeCall)) {
      endActiveCall();
    }
  }, [activeCall?.id, activeCall?.status, activeCall?.startedAt, endActiveCall]);

  // Synchronize speaker mute state to remoteAudioRef
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  // Format seconds into MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Safe stream stop and hardware cleanup
  const stopMediaStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      remoteStreamRef.current = null;
    }
    if (candidateFlushTimeoutRef.current) {
      clearTimeout(candidateFlushTimeoutRef.current);
      candidateFlushTimeoutRef.current = null;
    }
    pendingCandidatesRef.current = [];
    queuedRemoteCandidatesRef.current = [];
    if (audioMeterRef.current) {
      try {
        cancelAnimationFrame(audioMeterRef.current.animId);
        audioMeterRef.current.source.disconnect();
      } catch (_) {}
      audioMeterRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (_) {}
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setHasRemoteVideo(false);
    offerCreatedRef.current = false;
    answerCreatedRef.current = false;
    localCandidatesRef.current = [];
    appliedCandidatesRef.current.clear();
  }, []);

  // Stop any active ringtone
  const stopActiveRingtone = useCallback(() => {
    if (ringtoneStopperRef.current) {
      try {
        ringtoneStopperRef.current();
      } catch (_) {}
      ringtoneStopperRef.current = null;
    }
  }, []);

  // Guarantee complete teardown on component unmount and window close
  useEffect(() => {
    const handleUnload = () => {
      stopActiveRingtone();
      stopMediaStream();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      handleUnload();
    };
  }, [stopActiveRingtone, stopMediaStream]);

  // Keep local video preview DOM element bound to local stream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && mode === 'video' && !isVideoOff) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [mode, isVideoOff, facingMode]);

  // Keep remote video preview DOM element bound to remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current && hasRemoteVideo) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [hasRemoteVideo, isSwappedViews]);

  // Keep remote audio DOM element bound to remote stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
      remoteAudioRef.current.muted = isSpeakerMuted;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [isSpeakerMuted]);

  // -------------------------------------------------------------
  // 1. Ringtone & Audio Handling based on activeCall.status
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCall) {
      stopActiveRingtone();
      stopMediaStream();
      return;
    }

    if (activeCall.status === 'ringing') {
      stopActiveRingtone();
      if (isRecipient) {
        // Incoming ringtone on partner's phone
        ringtoneStopperRef.current = startIncomingRingtone();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([400, 300, 400, 300, 600]);
          } catch (_) {}
        }
      } else if (isCaller) {
        // Outgoing soft ring on caller's phone
        ringtoneStopperRef.current = startCallingRingtone();
      }
    } else if (activeCall.status === 'connected') {
      stopActiveRingtone();
      playCallConnectedSound();
    } else if (activeCall.status === 'declined' || activeCall.status === 'ended') {
      stopActiveRingtone();
      playCallEndedSound();
      stopMediaStream();
    }

    return () => {
      stopActiveRingtone();
    };
  }, [activeCall?.status, activeCall?.id, isCaller, isRecipient, stopActiveRingtone, stopMediaStream]);

  // -------------------------------------------------------------
  // 2. Synchronized Live Duration Timer
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || !activeCall.connectedAt) {
      setDurationSec(0);
      return;
    }

    const connectedTime = new Date(activeCall.connectedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - connectedTime) / 1000));
      setDurationSec(elapsed);
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status, activeCall?.connectedAt]);

  // ICE candidate collector with debouncing
  const queueLocalCandidate = useCallback(
    (candStr: string) => {
      if (localCandidatesRef.current.includes(candStr)) return;
      localCandidatesRef.current.push(candStr);
      pendingCandidatesRef.current.push(candStr);

      if (candidateFlushTimeoutRef.current) {
        clearTimeout(candidateFlushTimeoutRef.current);
      }
      candidateFlushTimeoutRef.current = setTimeout(() => {
        if (pendingCandidatesRef.current.length > 0) {
          const batch = [...pendingCandidatesRef.current];
          pendingCandidatesRef.current = [];
          if (isCaller) {
            updateCallSession({
              iceCandidatesCaller: batch,
            });
          } else {
            updateCallSession({
              iceCandidatesRecipient: batch,
            });
          }
        }
      }, 120);
    },
    [isCaller, updateCallSession]
  );

  // -------------------------------------------------------------
  // 3. Media Stream Acquisition & WebRTC PeerConnection
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      return;
    }

    let isCancelled = false;

    const setupMediaAndWebRTC = async () => {
      try {
        const { stream, hasAudio, hasVideo, notice } = await acquireCallMedia(mode, facingMode);

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (notice) {
          setPermissionNotice(notice);
        } else {
          setPermissionNotice(null);
        }

        if (mode === 'video' && !hasVideo) {
          setIsVideoOff(true);
        }

        localStreamRef.current = stream;

        // Attach local preview immediately
        if (localVideoRef.current && mode === 'video' && hasVideo) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Setup audio visualizer for mic amplitude
        if (hasAudio) {
          try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (isCancelled) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / (dataArray.length * 255);
              setMicAudioLevel(Math.max(0.15, Math.min(1.0, avg * 2.5 + 0.15)));
              audioMeterRef.current = {
                animId: requestAnimationFrame(updateMeter),
                analyser,
                source,
              };
            };
            updateMeter();
          } catch (_) {}
        }

        // Setup WebRTC PeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Container for incoming remote tracks
        remoteStreamRef.current = new MediaStream();

        // Add local tracks to WebRTC
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Remote track handler for incoming partner audio/video
        pc.ontrack = (event) => {
          const track = event.track;
          if (remoteStreamRef.current && !remoteStreamRef.current.getTracks().some((t) => t.id === track.id)) {
            remoteStreamRef.current.addTrack(track);
          }

          if (track.kind === 'audio') {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStreamRef.current;
              remoteAudioRef.current.muted = isSpeakerMuted;
              remoteAudioRef.current.play().catch((err) => {
                console.debug('Remote audio autoplay waiting for user interaction:', err);
              });
            }
          }

          if (track.kind === 'video') {
            setHasRemoteVideo(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current.play().catch((err) => {
                console.debug('Remote video autoplay waiting for user interaction:', err);
              });
            }
          }
        };

        // ICE candidate collector
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candStr = JSON.stringify(event.candidate);
            queueLocalCandidate(candStr);
          }
        };

        // Connection resilience
        pc.oniceconnectionstatechange = () => {
          console.debug('WebRTC ICE state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            try {
              pc.restartIce();
            } catch (_) {}
          }
        };

        // Caller creates initial WebRTC Offer
        if (isCaller && !offerCreatedRef.current && !activeCall.sdpOffer) {
          offerCreatedRef.current = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateCallSession({
            sdpOffer: JSON.stringify(offer),
          });
        }
      } catch (err: any) {
        console.warn('Call setup error:', err);
      }
    };

    setupMediaAndWebRTC();

    return () => {
      isCancelled = true;
    };
  }, [activeCall?.id, activeCall?.status, mode, isCaller, facingMode, queueLocalCandidate, updateCallSession, isSpeakerMuted]);

  // -------------------------------------------------------------
  // 4. WebRTC Signaling Exchanges (Offer -> Answer -> Remote ICE)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || !peerConnectionRef.current) {
      return;
    }

    const pc = peerConnectionRef.current;

    // Helper to safely apply candidate
    const applyCandidate = async (candStr: string) => {
      if (appliedCandidatesRef.current.has(candStr)) return;
      appliedCandidatesRef.current.add(candStr);
      try {
        const candidate = new RTCIceCandidate(JSON.parse(candStr));
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.debug('Add ICE candidate notice:', err);
      }
    };

    // Helper to flush queued remote candidates once remote description is set
    const flushQueuedCandidates = async () => {
      const candidatesToFlush = [...queuedRemoteCandidatesRef.current];
      queuedRemoteCandidatesRef.current = [];
      for (const candStr of candidatesToFlush) {
        await applyCandidate(candStr);
      }
    };

    // Recipient receives Offer and creates Answer
    if (isRecipient && activeCall.sdpOffer && !answerCreatedRef.current && pc.signalingState === 'stable') {
      const applyOfferAndAnswer = async () => {
        try {
          answerCreatedRef.current = true;
          const offerDesc = new RTCSessionDescription(JSON.parse(activeCall.sdpOffer!));
          await pc.setRemoteDescription(offerDesc);
          await flushQueuedCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateCallSession({
            sdpAnswer: JSON.stringify(answer),
          });
        } catch (err) {
          console.debug('WebRTC recipient answer notice:', err);
        }
      };
      applyOfferAndAnswer();
    }

    // Caller receives Answer from recipient
    if (isCaller && activeCall.sdpAnswer && pc.signalingState === 'have-local-offer') {
      const applyAnswer = async () => {
        try {
          const answerDesc = new RTCSessionDescription(JSON.parse(activeCall.sdpAnswer!));
          await pc.setRemoteDescription(answerDesc);
          await flushQueuedCandidates();
        } catch (err) {
          console.debug('WebRTC caller apply answer notice:', err);
        }
      };
      applyAnswer();
    }

    // Process remote ICE candidates
    const remoteCandidates = isCaller
      ? activeCall.iceCandidatesRecipient || []
      : activeCall.iceCandidatesCaller || [];

    if (remoteCandidates.length > 0) {
      remoteCandidates.forEach((candStr) => {
        if (!appliedCandidatesRef.current.has(candStr)) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            applyCandidate(candStr);
          } else {
            if (!queuedRemoteCandidatesRef.current.includes(candStr)) {
              queuedRemoteCandidatesRef.current.push(candStr);
            }
          }
        }
      });
    }
  }, [
    activeCall?.sdpOffer,
    activeCall?.sdpAnswer,
    activeCall?.iceCandidatesCaller,
    activeCall?.iceCandidatesRecipient,
    isCaller,
    isRecipient,
    updateCallSession,
  ]);

  // -------------------------------------------------------------
  // 5. Real-Time Floating Love Reactions Sync
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeCall?.reaction) return;
    const { emoji, timestamp } = activeCall.reaction;
    if (timestamp > lastProcessedReactionRef.current) {
      lastProcessedReactionRef.current = timestamp;
      playCallHeartReactionSound();
      const newHeart: FloatingHeart = {
        id: timestamp + Math.random(),
        emoji,
        left: 15 + Math.random() * 70,
        size: 26 + Math.random() * 22,
      };
      setFloatingHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 2000);
    }
  }, [activeCall?.reaction]);

  // Flip Camera for Mobile
  const handleFlipCamera = async () => {
    if (mode !== 'video') return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (localStreamRef.current) {
      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach((track) => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
          if (peerConnectionRef.current) {
            const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          }
        }
      } catch (err) {
        console.warn('Camera flip error:', err);
      }
    }
  };

  // Toggle Mute Mic
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts for laptop / desktop users (M to mute/unmute, Escape to end/cancel call)
  useEffect(() => {
    if (!activeCall || activeCall.status === 'ended') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'Escape') {
        endActiveCall();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCall, endActiveCall, handleToggleMute]);

  // Toggle Video Track
  const handleToggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);


  // Trigger floating heart
  const handleSendHeart = (emoji: string = '❤️') => {
    sendCallReaction(emoji);
  };

  if (!activeCall) return null;

  // Partner info display
  const partnerName = isCaller ? activeCall.recipientName : activeCall.callerName;
  const partnerAvatar = isCaller ? (activeCall.recipientAvatar || partnerUser.avatarUrl) : (activeCall.callerAvatar || partnerUser.avatarUrl);
  const partnerCity = isCaller ? (activeCall.recipientCity || partnerUser.city) : (activeCall.callerCity || partnerUser.city);

  const renderModalBody = () => {
    // -------------------------------------------------------------
    // INCOMING CALL VIEW (Ringing on Recipient Phone)
    // -------------------------------------------------------------
    if (status === 'ringing' && isRecipient) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-rose-950/40 to-black text-white p-6 shadow-2xl border border-rose-500/30 flex flex-col items-center text-center">
          {/* Concentric romantic aura pulse */}
          <div className="relative my-6">
            <div className="absolute -inset-4 rounded-full bg-rose-500/30 animate-ping opacity-75" />
            <div className="absolute -inset-8 rounded-full bg-pink-500/20 animate-pulse" />
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-28 h-28 rounded-full object-cover border-4 border-rose-400 shadow-2xl relative z-10"
            />
            <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center z-20">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold mb-2 flex items-center gap-1.5 animate-pulse">
            {mode === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>Incoming {mode === 'video' ? 'Video' : 'Voice'} Call</span>
          </span>

          <h2 className="text-2xl font-black text-white tracking-wide">{partnerName}</h2>
          <div className="text-xs text-rose-200/90 mt-1 flex items-center justify-center gap-2 font-medium">
            <span>📍 {partnerCity || 'Bengaluru'}</span>
            <span>•</span>
            <span>{formatISTTime(new Date())} IST</span>
          </div>

          <p className="text-xs text-slate-300 mt-3 italic">
            Your love is calling your private couple line... 💖
          </p>

          {/* Accept / Decline Action Buttons */}
          <div className="flex items-center justify-around w-full mt-8 gap-6">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  declineIncomingCall();
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition active:scale-90 cursor-pointer tap-bounce"
                title="Decline Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs font-bold text-slate-300">Decline</span>
            </div>

            {/* Accept / Lift Call Button */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="absolute -inset-2.5 rounded-full bg-emerald-500/35 animate-ping pointer-events-none" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.play().catch(() => {});
                    }
                    acceptIncomingCall();
                  }}
                  className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-600 hover:to-teal-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/60 ring-4 ring-emerald-400/50 transition active:scale-90 cursor-pointer tap-bounce animate-bounce"
                  title="Lift Call"
                >
                  <PhoneCall className="w-9 h-9" />
                </button>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs tracking-wide border border-emerald-500/30">
                Lift / Accept
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CALL DECLINED OR ENDED OVERLAY
  // -------------------------------------------------------------
  if (status === 'declined' || status === 'ended') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-rose-500/20 text-white p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <PhoneOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {status === 'declined' ? 'Call Declined' : 'Call Ended'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {durationSec > 0 ? `Duration: ${formatDuration(durationSec)}` : `Line closed with ${partnerName}`}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MINIMIZED IN-APP PIP WIDGET
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 text-white rounded-3xl p-3 shadow-2xl flex items-center gap-3 w-72 max-w-[90vw]">
          <div className="relative">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-400"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 flex items-center justify-center text-[9px]">
              {mode === 'video' ? '📹' : '📞'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate text-rose-100 flex items-center gap-1">
              <span>{partnerName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              {status === 'ringing' ? 'Calling...' : formatDuration(durationSec)}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
              title="Expand call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleMute}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${
                isMuted ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40' : 'bg-white/15 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={endActiveCall}
              className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition active:scale-95 shadow-md cursor-pointer"
              title="End call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL SCREEN / MODAL CALL SCREEN (Ringing Outgoing or Connected)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:max-w-md md:max-w-xl lg:max-w-2xl sm:h-[88vh] sm:max-h-[820px] bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-rose-500/20">
        {/* Floating Hearts Animation */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {floatingHearts.map((heart) => (
            <div
              key={heart.id}
              style={{
                left: `${heart.left}%`,
                bottom: '120px',
                fontSize: `${heart.size}px`,
              }}
              className="absolute animate-heart-float select-none drop-shadow-md"
            >
              {heart.emoji}
            </div>
          ))}
        </div>

        {/* Top Header Bar */}
        <div className="relative z-20 px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {mode === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
            <div>
              <div className="text-xs font-bold text-rose-100 flex items-center gap-1.5">
                <span>{mode === 'video' ? 'Video Call' : 'Voice Call'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Encrypted 2-Device</span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                {status === 'ringing' ? (
                  <span className="text-rose-300 font-semibold animate-pulse">Calling partner...</span>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-200">{formatDuration(durationSec)}</span>
                    <span className="text-slate-400">• HD Stream</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
              title="Minimize call to app"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission Notification Banner */}
        {permissionNotice && (
          <div className="relative z-20 mx-4 mb-2 p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="flex-1 text-[11px] leading-snug">{permissionNotice}</span>
            <button
              onClick={() => setPermissionNotice(null)}
              className="text-amber-300 hover:text-white font-bold p-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Stage Area */}
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
          {/* ========================================================= */}
          {/* VIDEO CALL MODE */}
          {/* ========================================================= */}
          {mode === 'video' && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Partner Main Video Feed / Stage */}
              <div className="absolute inset-0 overflow-hidden bg-slate-950 flex items-center justify-center">
                {/* Real Remote WebRTC Partner Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
                />

                {/* Romantic Avatar Fallback while ringing or if partner camera is off */}
                {!hasRemoteVideo && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-rose-950/40 z-10" />
                    <img
                      src={partnerAvatar}
                      alt={partnerName}
                      className="w-full h-full object-cover opacity-60 filter blur-xs scale-105"
                    />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 max-w-xs">
                      <div className="relative mb-4">
                        {status === 'ringing' && (
                          <div className="absolute -inset-4 rounded-full bg-rose-500/30 animate-ping opacity-75" />
                        )}
                        <img
                          src={partnerAvatar}
                          alt={partnerName}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-rose-400/80 shadow-2xl ring-4 ring-rose-500/20"
                        />
                        <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-1.5">
                        <span>{partnerName}</span>
                        <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      </h3>

                      <div className="text-xs text-rose-200/90 mt-1 flex items-center justify-center gap-2 font-medium">
                        <span>📍 {partnerCity || 'Bengaluru'}</span>
                        <span>•</span>
                        <span>{formatISTTime(new Date())} IST</span>
                      </div>

                      {status === 'ringing' && (
                        <div className="mt-3 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold animate-pulse">
                          Calling {partnerName}'s phone... 💖
                        </div>
                      )}

                      {status === 'connected' && (
                        <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          <span>Live 2-Device Couple Connection</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Local Camera Preview (Corner PiP) */}
              <div
                onClick={() => setIsSwappedViews(!isSwappedViews)}
                className="absolute top-4 right-4 z-20 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-2xl bg-slate-900 cursor-pointer group transition-transform active:scale-95"
                title="Tap to switch view"
              >
                {!isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-rose-300 mb-1 opacity-80"
                    />
                    <span className="text-[10px] text-slate-300">Camera Off</span>
                  </div>
                )}

                <div className="absolute bottom-1 left-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white/90 truncate flex items-center justify-between">
                  <span>You</span>
                  {isMuted && <MicOff className="w-2.5 h-2.5 text-amber-400" />}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VOICE CALL MODE */}
          {/* ========================================================= */}
          {mode === 'voice' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute w-72 h-72 rounded-full bg-rose-500/10 blur-3xl animate-pulse pointer-events-none" />

              <div className="relative mb-6">
                <div
                  style={{ transform: `scale(${1 + micAudioLevel * 0.4})` }}
                  className="absolute -inset-4 rounded-full bg-rose-500/20 transition-transform duration-100 ease-out"
                />
                <div
                  style={{ transform: `scale(${1 + micAudioLevel * 0.7})` }}
                  className="absolute -inset-8 rounded-full bg-pink-500/10 transition-transform duration-100 ease-out"
                />
                {status === 'ringing' && (
                  <div className="absolute -inset-6 rounded-full bg-rose-400/20 animate-ping opacity-60" />
                )}

                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-36 h-36 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-rose-400/90 shadow-2xl relative z-10"
                />

                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center z-10">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                <span>{partnerName}</span>
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
              </h2>

              <div className="text-xs text-rose-200/90 mt-1 flex items-center justify-center gap-2 font-medium">
                <span>📍 {partnerCity || 'Bengaluru'}</span>
                <span>•</span>
                <span>{formatISTTime(new Date())} IST</span>
              </div>

              {status === 'ringing' ? (
                <div className="mt-4 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold animate-pulse">
                  Calling {partnerName}'s phone... 📞💖
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="text-xs font-mono text-emerald-300 font-bold">
                    Connected · {formatDuration(durationSec)}
                  </div>

                  {/* Audio Wave Visualizer */}
                  <div className="flex items-center gap-1.5 h-8 px-4 py-1 bg-black/40 backdrop-blur-md rounded-2xl border border-rose-500/20">
                    {[0.3, 0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 0.4, 0.6, 0.9, 0.3].map((factor, idx) => {
                      const dynamicHeight = Math.max(
                        6,
                        Math.min(26, Math.round(micAudioLevel * 24 * factor + 4))
                      );
                      return (
                        <span
                          key={idx}
                          style={{ height: `${dynamicHeight}px` }}
                          className="w-1 bg-gradient-to-t from-rose-500 to-pink-300 rounded-full transition-all duration-75"
                        />
                      );
                    })}
                  </div>

                  <span className="text-[11px] text-slate-400 italic mt-1">
                    "Distance is just a number when two hearts beat as one ❤️"
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Romantic Emoji Reaction Bar (Broadcasts to partner live!) */}
        <div className="relative z-20 px-4 py-2 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
          {['❤️', '💖', '😘', '🌹', '✨', '🥰'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendHeart(emoji)}
              className="text-xl sm:text-2xl p-1.5 hover:scale-125 transition-transform active:scale-95 cursor-pointer tap-bounce"
              title={`Send ${emoji} to ${partnerName}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* In-Call Controls Dock */}
        <div className="relative z-20 px-4 py-4 sm:px-6 sm:py-5 bg-slate-950/90 backdrop-blur-xl border-t border-rose-500/20 flex items-center justify-around gap-2 pb-safe">
          {/* Mute Mic */}
          <button
            onClick={handleToggleMute}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer ${
              isMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] mt-0.5 font-medium">{isMuted ? 'Muted' : 'Mic'}</span>
          </button>

          {/* Toggle Video (in video mode) */}
          {mode === 'video' && (
            <button
              onClick={handleToggleVideo}
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer ${
                isVideoOff
                  ? 'bg-white/10 text-slate-400'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
              title={isVideoOff ? 'Turn video on' : 'Turn video off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              <span className="text-[9px] mt-0.5 font-medium">{isVideoOff ? 'Video Off' : 'Video On'}</span>
            </button>
          )}

          {/* Flip Camera (in video mode) or Speaker toggle (in voice mode) */}
          {mode === 'video' ? (
            <button
              onClick={handleFlipCamera}
              className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center justify-center transition active:scale-90 cursor-pointer"
              title="Flip camera (front / rear)"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium">Flip</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition active:scale-90 cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              <span className="text-[9px] mt-0.5 font-medium">{isSpeakerMuted ? 'Muted' : 'Speaker'}</span>
            </button>
          )}

          {/* Love Sparkle Reaction Button */}
          <button
            onClick={() => handleSendHeart('💖')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-500/30 transition active:scale-90 cursor-pointer tap-bounce"
            title="Send love burst to partner"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] mt-0.5 font-medium">Love</span>
          </button>

          {/* End Call / Cancel Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={endActiveCall}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition active:scale-90 cursor-pointer tap-bounce"
              title={status === 'ringing' ? 'Cancel Call' : 'End Call'}
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[9px] mt-0.5 font-bold text-red-300">
              {status === 'ringing' ? 'Cancel' : 'End'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div
      onClick={() => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.play().catch(() => {});
        }
      }}
      className="contents"
    >
      {/* Permanent audio element for real-time remote audio in voice and video calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />
      {renderModalBody()}
    </div>
  );
};
