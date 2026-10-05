import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import {
  Phone,
  PhoneOff,
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
  Smile,
  AlertCircle,
} from 'lucide-react';
import {
  startCallingRingtone,
  playCallConnectedSound,
  playCallEndedSound,
  playCallHeartReactionSound,
} from '../utils/callAudio';
import { getAudioContext } from '../utils/audioNotes';
import { formatISTTime } from '../utils/indianCities';

interface CallModalProps {
  isOpen: boolean;
  mode: 'voice' | 'video';
  partnerUser: UserProfile;
  currentUser: UserProfile;
  onClose: () => void;
  onCallEnded?: (summary: { mode: 'voice' | 'video'; durationSec: number }) => void;
  onSwitchMode?: (newMode: 'voice' | 'video') => void;
}

interface FloatingHeart {
  id: number;
  emoji: string;
  left: number; // percentage
  size: number;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  mode,
  partnerUser,
  currentUser,
  onClose,
  onCallEnded,
  onSwitchMode,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [durationSec, setDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(mode === 'voice');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSwappedViews, setIsSwappedViews] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [micAudioLevel, setMicAudioLevel] = useState(0.2);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringtoneStopperRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioMeterRef = useRef<{ animId: number; analyser: AnalyserNode; source: MediaStreamAudioSourceNode } | null>(null);
  const durationRef = useRef(0);

  durationRef.current = durationSec;

  // Format seconds into MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Safe stream stop
  const stopMediaStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      localStreamRef.current = null;
    }
    if (audioMeterRef.current) {
      try {
        cancelAnimationFrame(audioMeterRef.current.animId);
        audioMeterRef.current.source.disconnect();
      } catch (_) {}
      audioMeterRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // Safe termination
  const handleEndCall = useCallback(() => {
    // Stop ringing if still ringing
    if (ringtoneStopperRef.current) {
      ringtoneStopperRef.current();
      ringtoneStopperRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    playCallEndedSound();
    setCallStatus('ended');
    stopMediaStream();

    const finalSecs = durationRef.current;
    setTimeout(() => {
      onCallEnded?.({ mode, durationSec: finalSecs });
      onClose();
    }, 1200);
  }, [mode, onCallEnded, onClose, stopMediaStream]);

  // Request media stream on mount / mode change
  useEffect(() => {
    if (!isOpen) return;

    setCallStatus('ringing');
    setDurationSec(0);
    setIsMinimized(false);
    setIsMuted(false);
    setIsVideoOff(mode === 'voice');
    setPermissionNotice(null);

    // 1. Play calling tone
    const stopper = startCallingRingtone();
    ringtoneStopperRef.current = stopper;

    // 2. Request user media
    let isCancelled = false;

    const setupStream = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video:
            mode === 'video'
              ? {
                  facingMode,
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                }
              : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Attach to video element if video mode
        if (localVideoRef.current && mode === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        // Setup live mic analyser for visualizer waves
        try {
          const ctx = getAudioContext();
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
        } catch (_) {
          // Non-critical visualizer fallback
        }
      } catch (err: any) {
        console.warn('Camera/mic access note:', err);
        if (!isCancelled) {
          if (mode === 'video') {
            setPermissionNotice('Camera unavailable or permission denied. Switched to romantic voice/avatar call mode.');
            setIsVideoOff(true);
          }
        }
      }
    };

    setupStream();

    // 3. Simulate partner answering after ~2.8s
    const connectTimer = window.setTimeout(() => {
      if (isCancelled) return;

      if (ringtoneStopperRef.current) {
        ringtoneStopperRef.current();
        ringtoneStopperRef.current = null;
      }

      playCallConnectedSound();
      setCallStatus('connected');

      // Start elapsed timer
      timerRef.current = window.setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
    }, 2800);

    return () => {
      isCancelled = true;
      clearTimeout(connectTimer);
      if (ringtoneStopperRef.current) {
        ringtoneStopperRef.current();
        ringtoneStopperRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopMediaStream();
    };
  }, [isOpen, mode, facingMode, stopMediaStream]);

  // Flip Camera for mobile devices
  const handleFlipCamera = async () => {
    if (mode !== 'video') return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    if (localStreamRef.current) {
      // Stop old video track
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: false,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack && localStreamRef.current) {
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
      } catch (err) {
        console.warn('Failed to switch camera:', err);
      }
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (mode === 'voice') {
      onSwitchMode?.('video');
      return;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    } else {
      setIsVideoOff((prev) => !prev);
    }
  };

  // Send Floating Love Heart
  const handleSendHeartReaction = (emoji: string = '❤️') => {
    playCallHeartReactionSound();
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      emoji,
      left: 15 + Math.random() * 70, // 15% to 85%
      size: 24 + Math.random() * 20,
    };
    setFloatingHearts((prev) => [...prev, newHeart]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Minimized In-App PiP Widget
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 text-white rounded-3xl p-3 shadow-2xl flex items-center gap-3 w-72 max-w-[90vw]">
          <div className="relative">
            <img
              src={partnerUser.avatarUrl}
              alt={partnerUser.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-400"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 flex items-center justify-center text-[9px]">
              {mode === 'video' ? '📹' : '📞'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate text-rose-100 flex items-center gap-1">
              <span>{partnerUser.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              {callStatus === 'ringing' ? 'Calling...' : formatDuration(durationSec)}
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95"
              title="Expand call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleMute}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 ${
                isMuted ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40' : 'bg-white/15 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition active:scale-95 shadow-md"
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
  // Full Screen / Modal Experience
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:max-w-md md:max-w-lg sm:h-[88vh] sm:max-h-[780px] bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-rose-500/20">
        {/* Floating Hearts Container */}
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
                  <span>Private</span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                {callStatus === 'ringing' ? (
                  <span className="text-rose-300 font-semibold animate-pulse">Ringing partner...</span>
                ) : callStatus === 'connected' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-200">{formatDuration(durationSec)}</span>
                    <span className="text-slate-400">• HD Audio</span>
                  </>
                ) : (
                  <span className="text-rose-400 font-bold">Call Ended</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Minimize to PiP Button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
              title="Minimize call to chat"
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
              {/* Partner Main Video Feed (Realistic Romantic View) */}
              <div className="absolute inset-0 overflow-hidden bg-slate-950 flex items-center justify-center">
                {/* Backdrop ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-rose-950/40 z-10" />

                <img
                  src={partnerUser.avatarUrl}
                  alt={partnerUser.name}
                  className="w-full h-full object-cover opacity-60 filter blur-xs scale-105"
                />

                {/* Partner Center Avatar / Video Card */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 max-w-xs">
                  <div className="relative mb-4">
                    {/* Concentric romantic aura pulse */}
                    {callStatus === 'ringing' && (
                      <div className="absolute -inset-4 rounded-full bg-rose-500/30 animate-ping opacity-75" />
                    )}
                    <img
                      src={partnerUser.avatarUrl}
                      alt={partnerUser.name}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-rose-400/80 shadow-2xl ring-4 ring-rose-500/20"
                    />
                    <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>{partnerUser.name}</span>
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </h3>

                  <div className="text-xs text-rose-200/90 mt-1 flex items-center justify-center gap-2 font-medium">
                    <span>📍 {partnerUser.city || 'Bengaluru'}</span>
                    <span>•</span>
                    <span>{formatISTTime(new Date())} IST</span>
                  </div>

                  {callStatus === 'ringing' && (
                    <div className="mt-3 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold animate-pulse">
                      Calling your love... 💖
                    </div>
                  )}

                  {callStatus === 'connected' && (
                    <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                      <Wifi className="w-3 h-3 text-emerald-400" />
                      <span>Live Encrypted Couple Stream</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Self-View Camera (Corner PiP) */}
              <div
                onClick={() => setIsSwappedViews(!isSwappedViews)}
                className="absolute top-4 right-4 z-20 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-2xl bg-slate-900 cursor-pointer group transition-transform active:scale-95"
                title="Tap to switch camera view"
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

                {/* Self View Overlay Badge */}
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
              {/* Romantic background gradient rings */}
              <div className="absolute w-72 h-72 rounded-full bg-rose-500/10 blur-3xl animate-pulse pointer-events-none" />

              <div className="relative mb-6">
                {/* Concentric animated sound rings */}
                <div
                  style={{ transform: `scale(${1 + micAudioLevel * 0.4})` }}
                  className="absolute -inset-4 rounded-full bg-rose-500/20 transition-transform duration-100 ease-out"
                />
                <div
                  style={{ transform: `scale(${1 + micAudioLevel * 0.7})` }}
                  className="absolute -inset-8 rounded-full bg-pink-500/10 transition-transform duration-100 ease-out"
                />
                {callStatus === 'ringing' && (
                  <div className="absolute -inset-6 rounded-full bg-rose-400/20 animate-ping opacity-60" />
                )}

                <img
                  src={partnerUser.avatarUrl}
                  alt={partnerUser.name}
                  className="w-36 h-36 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-rose-400/90 shadow-2xl relative z-10"
                />

                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-slate-950 flex items-center justify-center z-10">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                <span>{partnerUser.name}</span>
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
              </h2>

              <div className="text-xs text-rose-200/90 mt-1 flex items-center justify-center gap-2 font-medium">
                <span>📍 {partnerUser.city || 'Bengaluru'}</span>
                <span>•</span>
                <span>{formatISTTime(new Date())} IST</span>
              </div>

              {/* Status or Visualizer Waves */}
              {callStatus === 'ringing' ? (
                <div className="mt-4 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold animate-pulse">
                  Calling your love... 📞💖
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="text-xs font-mono text-emerald-300 font-bold">
                    Connected · {formatDuration(durationSec)}
                  </div>

                  {/* Audio Wave Bars */}
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

        {/* Quick Romantic Emoji Reaction Bar (Tap to send floating hearts) */}
        <div className="relative z-20 px-4 py-2 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
          {['❤️', '💖', '😘', '🌹', '✨', '🥰'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendHeartReaction(emoji)}
              className="text-xl sm:text-2xl p-1.5 hover:scale-125 transition-transform active:scale-95 cursor-pointer tap-bounce"
              title={`Send ${emoji} to ${partnerUser.name}`}
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

          {/* Toggle Video */}
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
            onClick={() => handleSendHeartReaction('💖')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-500/30 transition active:scale-90 cursor-pointer tap-bounce"
            title="Send love burst"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] mt-0.5 font-medium">Love</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition active:scale-90 cursor-pointer"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
