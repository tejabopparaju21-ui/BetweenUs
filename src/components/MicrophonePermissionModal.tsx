import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  Sparkles,
  HelpCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { getAudioContext } from '../utils/audioNotes';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [status, setStatus] = useState<'checking' | 'prompt' | 'granted' | 'denied' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);

  const testStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check initial permission status if Permissions API supported
  useEffect(() => {
    if (!isOpen) {
      stopTest();
      return;
    }

    let isMounted = true;
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (!isMounted) return;
          if (perm.state === 'granted') {
            setStatus('granted');
            startTest();
          } else if (perm.state === 'denied') {
            setStatus('denied');
          } else {
            setStatus('prompt');
          }

          perm.onchange = () => {
            if (!isMounted) return;
            if (perm.state === 'granted') {
              setStatus('granted');
              startTest();
              if (onPermissionGranted) onPermissionGranted();
            } else if (perm.state === 'denied') {
              setStatus('denied');
              stopTest();
            } else {
              setStatus('prompt');
            }
          };
        } else {
          setStatus('prompt');
        }
      } catch (_) {
        if (isMounted) setStatus('prompt');
      }
    };

    checkPermission();

    return () => {
      isMounted = false;
      stopTest();
    };
  }, [isOpen]);

  const stopTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((track) => track.stop());
      testStreamRef.current = null;
    }
    setIsTestingMic(false);
    setAudioLevel(0);
  };

  const startTest = async () => {
    stopTest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStreamRef.current = stream;
      setIsTestingMic(true);

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const loop = () => {
        if (!testStreamRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = sum / data.length;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
    } catch (err: any) {
      console.warn('Mic test stream error:', err);
    }
  };

  const handleRequestPermission = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStatus('granted');
      testStreamRef.current = stream;
      setIsTestingMic(true);
      startTest();

      if (onPermissionGranted) {
        onPermissionGranted();
      }
    } catch (err: any) {
      console.error('Request permission rejected:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Microphone access was declined or blocked by your browser.');
      } else if (err?.name === 'NotFoundError') {
        setStatus('error');
        setErrorMessage('No microphone device found on your device.');
      } else {
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to access microphone.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
                status === 'granted'
                  ? 'bg-emerald-500 shadow-emerald-500/20'
                  : status === 'denied'
                  ? 'bg-red-500 shadow-red-500/20'
                  : 'bg-rose-600 shadow-rose-600/20'
              }`}
            >
              {status === 'granted' ? (
                <Mic className="w-5 h-5" />
              ) : status === 'denied' ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Microphone Access</h3>
              <p className="text-xs text-slate-500">Record and send warm voice notes to your partner</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopTest();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on status */}
        <div className="py-5 space-y-4">
          {status === 'granted' ? (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Microphone is Connected & Ready!</h4>
              <p className="text-xs text-slate-600">
                You can now record voice notes directly from the chat box by tapping the microphone icon.
              </p>

              {/* Live Audio Test Wave */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 block mb-2">
                  🎙️ Speak now to test your microphone:
                </span>
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {[0.3, 0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 0.4, 0.6, 0.9].map((mult, idx) => {
                    const height = Math.max(4, Math.min(36, Math.round(audioLevel * 40 * mult + 4)));
                    return (
                      <span
                        key={idx}
                        style={{ height: `${height}px` }}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          audioLevel > 0.05 ? 'bg-emerald-600 shadow-xs' : 'bg-emerald-300'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-emerald-700 font-medium block mt-2">
                  {audioLevel > 0.05 ? '🟢 Voice detected!' : 'Listening for your voice...'}
                </span>
              </div>
            </div>
          ) : status === 'denied' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-red-800 block">Microphone Access is Blocked</span>
                  <p className="text-red-700 mt-0.5">
                    Your browser has microphone permissions set to "Block" for this site.
                  </p>
                </div>
              </div>

              {/* Step by step fix instructions */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-3">
                <span className="font-bold text-slate-800 block">How to enable microphone in 2 steps:</span>
                <ol className="list-decimal list-inside space-y-2 text-slate-700">
                  <li>
                    Look at your browser's <strong>address bar</strong> at the very top of your screen.
                  </li>
                  <li>
                    Click the <strong>Lock (🔒)</strong> or <strong>Site Settings icon</strong> next to the web address.
                  </li>
                  <li>
                    Find <strong>Microphone</strong> and switch it from <em>Block</em> to <strong>Allow</strong>.
                  </li>
                  <li>
                    Once allowed, click the <strong>"Try Again"</strong> button below!
                  </li>
                </ol>
              </div>

              {errorMessage && (
                <p className="text-[11px] text-red-600 italic text-center">{errorMessage}</p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center animate-bounce">
                <Mic className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Allow Microphone Access</h4>
                <p className="text-xs text-slate-600 mt-1">
                  When you tap the button below, your browser will prompt you to allow microphone access. Tap <strong>"Allow"</strong> so your partner can hear your voice.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-800 flex items-center gap-2 text-left">
                <Sparkles className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Your voice recordings are private, encrypted, and shared exclusively with your partner.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-rose-100 flex gap-2">
          {status === 'granted' ? (
            <button
              onClick={() => {
                stopTest();
                onClose();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done & Start Talking</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  stopTest();
                  onClose();
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Mic className="w-4 h-4" />
                <span>{status === 'denied' ? 'Try Again / Allow Mic' : 'Allow Microphone'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
