import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage, MessageReaction } from '../types';
import {
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Smile,
  Reply,
  Trash2,
  Check,
  CheckCheck,
  X,
  Volume2,
  Heart,
  Sparkles,
  Video,
  Camera,
  Upload,
  ArrowLeftRight,
  Wifi,
  Globe,
  Play,
  Pause,
  Loader2,
  Phone,
  PhoneOff,
  PhoneCall,
  MoreVertical,
  HeartHandshake,
} from 'lucide-react';
import { readFileAsDataUrl } from '../utils/fileUtils';
import { isPartnerSleeping } from '../utils/distance';
import { formatISTTime } from '../utils/indianCities';
import {
  startAudioRecording,
  playVoiceMessage,
  stopActiveVoicePlayback,
  playLoveTapChime,
  RecordingSession,
} from '../utils/audioNotes';
import { MicrophonePermissionModal } from './MicrophonePermissionModal';

export const CoupleChat: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    messages,
    sendMessage,
    deleteMessage,
    clearChatMessages,
    toggleMessageReaction,
    isOnline,
    isChatSyncing,
    chatError,
    firebaseUser,
    loginWithGoogle,
    startCall,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaFileName, setMediaFileName] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);

  // In-Chat Voice & Video Call State
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);

  const handleStartCall = (mode: 'voice' | 'video') => {
    startCall(mode);
  };

  const partnerSleeping = isPartnerSleeping(
    partnerUser.timeZone || 'Asia/Kolkata',
    partnerUser.sleepStartHour,
    partnerUser.sleepEndHour
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const levelAnimRef = useRef<number | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);

  // Real-time voice recording visualizer level (0 to 1)
  const [recordingAudioLevel, setRecordingAudioLevel] = useState<number>(0);

  // Audio Playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackPercent, setPlaybackPercent] = useState<number>(0);

  // Cleanly deduplicate call log messages from chat history
  const displayMessages = useMemo<ChatMessage[]>(() => {
    const renderedCallCards: { time: number; mode?: string; text: string }[] = [];

    return messages.filter((msg: ChatMessage) => {
      if (msg.type !== 'call' && msg.mediaType !== 'call') return true;

      const msgTime = new Date(msg.createdAt).getTime();
      const mode = msg.callData?.mode;
      const text = msg.text;

      // Check if a matching call card was already rendered within 3 minutes
      const isDuplicate = renderedCallCards.some((card) => {
        const timeDiff = Math.abs(msgTime - card.time);
        const isSameText = card.text === text;
        const isSameMode = card.mode && mode && card.mode === mode;
        return timeDiff < 180000 && (isSameText || isSameMode);
      });

      if (isDuplicate) {
        return false;
      }

      renderedCallCards.push({ time: msgTime, mode, text });
      return true;
    });
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isPartnerTyping]);

  // Cleanup active audio and recording on unmount
  useEffect(() => {
    return () => {
      stopActiveVoicePlayback();
      if (recordingSessionRef.current) {
        recordingSessionRef.current.cancel();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (levelAnimRef.current) cancelAnimationFrame(levelAnimRef.current);
    };
  }, []);

  // Handle real voice note recording with microphone
  const startVoiceRecording = async () => {
    setSendError(null);
    setRecordSeconds(0);

    try {
      const session = await startAudioRecording();
      recordingSessionRef.current = session;
      setIsRecordingVoice(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);

      const updateLevel = () => {
        if (recordingSessionRef.current) {
          setRecordingAudioLevel(recordingSessionRef.current.getAudioLevel());
          levelAnimRef.current = requestAnimationFrame(updateLevel);
        }
      };
      levelAnimRef.current = requestAnimationFrame(updateLevel);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setIsRecordingVoice(false);
      setSendError(
        err?.message ||
          'Could not access your microphone. Please check your browser permissions to allow microphone access.'
      );
      setShowMicPermissionModal(true);
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (levelAnimRef.current) cancelAnimationFrame(levelAnimRef.current);
    setIsRecordingVoice(false);
    const duration = Math.max(1, recordSeconds);

    if (!recordingSessionRef.current) {
      setSendError('No active microphone recording found.');
      setRecordSeconds(0);
      setRecordingAudioLevel(0);
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const res = await recordingSessionRef.current.stop();
      recordingSessionRef.current = null;

      if (!res.audioUrl) {
        throw new Error('No voice audio was captured. Please speak into your microphone.');
      }

      await sendMessage(
        `Voice note (${duration}s)`,
        res.audioUrl,
        'voice',
        duration,
        replyTarget
          ? {
              id: replyTarget.id,
              senderName: replyTarget.senderName,
              text: replyTarget.text,
            }
          : undefined
      );
      setReplyTarget(null);
    } catch (err: any) {
      console.error('Failed to send voice note:', err);
      setSendError(err?.message || 'Failed to send voice note');
    } finally {
      setIsSending(false);
      setRecordSeconds(0);
      setRecordingAudioLevel(0);
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (levelAnimRef.current) cancelAnimationFrame(levelAnimRef.current);
    if (recordingSessionRef.current) {
      recordingSessionRef.current.cancel();
      recordingSessionRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordSeconds(0);
    setRecordingAudioLevel(0);
  };

  const handleTogglePlayVoice = (msg: ChatMessage) => {
    if (playingMessageId === msg.id) {
      stopActiveVoicePlayback();
      setPlayingMessageId(null);
      setPlaybackTime(0);
      setPlaybackPercent(0);
      return;
    }

    if (!msg.mediaUrl) {
      setSendError('This voice note does not have recorded audio.');
      setTimeout(() => setSendError(null), 3500);
      return;
    }

    setPlayingMessageId(msg.id);
    setPlaybackTime(0);
    setPlaybackPercent(0);

    playVoiceMessage({
      messageId: msg.id,
      audioUrl: msg.mediaUrl,
      durationSec: msg.voiceDurationSec || 4,
      onProgress: (curSec, pct) => {
        setPlaybackTime(curSec);
        setPlaybackPercent(pct);
      },
      onEnded: () => {
        setPlayingMessageId(null);
        setPlaybackTime(0);
        setPlaybackPercent(0);
      },
    });
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const textToSend = inputVal.trim();
    const currentReply = replyTarget;

    setInputVal('');
    setReplyTarget(null);
    setShowEmojiPicker(false);
    setIsSending(true);
    setSendError(null);

    try {
      await sendMessage(
        textToSend,
        undefined,
        undefined,
        undefined,
        currentReply
          ? {
              id: currentReply.id,
              senderName: currentReply.senderName,
              text: currentReply.text,
            }
          : undefined
      );
    } catch (err: any) {
      console.error('Failed to send text:', err);
      setSendError(err?.message || 'Failed to send message');
      setInputVal(textToSend); // Restore user text
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMedia = async () => {
    if (!imageUrlInput.trim() || isSending) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendMessage(
        imageCaption.trim() || (mediaType === 'video' ? 'Shared a sweet video 🎬' : 'Shared a sweet photo 📸'),
        imageUrlInput.trim(),
        mediaType,
        undefined,
        replyTarget
          ? {
              id: replyTarget.id,
              senderName: replyTarget.senderName,
              text: replyTarget.text,
            }
          : undefined
      );
      setImageUrlInput('');
      setImageCaption('');
      setMediaFileName('');
      setMediaType('image');
      setShowImageModal(false);
      setReplyTarget(null);
    } catch (err: any) {
      setSendError(err?.message || 'Failed to upload media');
    } finally {
      setIsSending(false);
    }
  };

  const quickEmojis = ['❤️', '🥰', '😘', '🤗', '🌹', '✨', '🥺', '😭', '🔥', '☕', '🥐', '✈️'];

  return (
    <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col h-[calc(100dvh-120px)] sm:h-[calc(100vh-140px)] bg-slate-50/70 sm:rounded-3xl sm:border border-rose-100 sm:shadow-md sm:my-2 overflow-hidden transition-all">
      {/* Chat Sub-header */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 sm:px-5 py-2.5 border-b border-rose-100 flex items-center justify-between shadow-xs shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <img
              src={partnerUser.avatarUrl}
              alt={partnerUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-rose-300"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <span>{partnerUser.name}</span>
              <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                Private Couple Channel
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>📍 {partnerUser.city || 'Bengaluru'}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{formatISTTime(new Date())} IST</span>
              <span>•</span>
              <span className={partnerSleeping ? 'text-indigo-600 font-bold' : 'text-emerald-600 font-bold'}>
                {partnerSleeping ? 'Sleeping 🌙' : 'Active ☀️'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Voice Call Button */}
          <button
            type="button"
            onClick={() => handleStartCall('voice')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200/80 flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer tap-bounce"
            title={`Voice Call with ${partnerUser.name}`}
            aria-label="Voice Call"
          >
            <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Video Call Button */}
          <button
            type="button"
            onClick={() => handleStartCall('video')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center transition active:scale-95 shadow-xs shadow-rose-500/25 cursor-pointer tap-bounce"
            title={`Video Call with ${partnerUser.name}`}
            aria-label="Video Call"
          >
            <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* More Chat Actions Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowChatOptionsMenu(!showChatOptionsMenu)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition border border-slate-200/80 cursor-pointer active:scale-95"
              title="More chat options"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showChatOptionsMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white/95 backdrop-blur-xl border border-rose-100 rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    handleStartCall('voice');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>Start Voice Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    handleStartCall('video');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-rose-500" />
                  <span>Start Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    window.dispatchEvent(new CustomEvent('open_pairing_modal'));
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2 transition cursor-pointer"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                  <span>Enter / View Couple Code</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowChatOptionsMenu(false);
                    setIsPartnerTyping(true);
                    setTimeout(() => setIsPartnerTyping(false), 2500);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simulate Partner Typing</span>
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatOptionsMenu(false);
                      setShowClearConfirmModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Clear Chat History</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity & Real-Time Cloud Sync Bar with Both Timings */}
      <div className="bg-gradient-to-r from-rose-50/90 via-pink-50/90 to-amber-50/90 px-3.5 py-1.5 border-b border-rose-100 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">You:</span>
          <span className="font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-rose-200/60 flex items-center gap-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{currentUser.name}</span>
            <span className="text-[10px] text-slate-400 font-medium">({currentUser.city || 'Hyderabad'})</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70">
            {formatISTTime(new Date())} IST
          </span>
          <span className={`hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
            isOnline
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70'
              : 'text-amber-800 bg-amber-50 border-amber-300'
          }`}>
            <Wifi className="w-2.5 h-2.5" />
            <span>{isOnline ? (isChatSyncing ? 'Syncing...' : 'Live Cloud') : 'Reconnecting...'}</span>
          </span>
        </div>

        {/* Partner Connection & Couple Code Quick Link */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open_pairing_modal'))}
            className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-white hover:bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 shadow-2xs transition active:scale-95 cursor-pointer"
            title="View or Enter Couple Code"
          >
            <span>🔗 {couple?.code || currentUser.coupleCode || 'PAIR CODE'}</span>
          </button>
          <span className="hidden xs:inline">With</span>
          <span className="font-extrabold text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-rose-200/60 shadow-2xs">
            {partnerUser.name}
          </span>
        </div>
      </div>

      {/* Network or Sync Error Banner */}
      {(sendError || chatError) && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-rose-700 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
            <span className="truncate">⚠️ {sendError || chatError}</span>
            {sendError && (sendError.toLowerCase().includes('micro') || sendError.toLowerCase().includes('permission')) && (
              <button
                type="button"
                onClick={() => setShowMicPermissionModal(true)}
                className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs shrink-0 cursor-pointer transition active:scale-95 flex items-center gap-1"
              >
                <Mic className="w-3 h-3" />
                <span>Grant Mic Access</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setSendError(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-2 shrink-0 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center py-2">
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-medium border border-rose-100">
            🔒 Private couple channel. Only {currentUser.name} and {partnerUser.name} can read this chat.
          </span>
        </div>

        {/* Empty Chat State */}
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100/70 flex items-center justify-center mb-3 text-rose-500 shadow-inner">
              <Heart className="w-7 h-7 fill-rose-500 text-rose-500 animate-pulse" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Your Private Haven is Ready</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Send the first sweet message to {partnerUser.name}. Messages are stored permanently in Cloud Firestore and sync in real time across devices.
            </p>
          </div>
        )}

        {displayMessages.map((msg: ChatMessage) => {
          const isMe =
            msg.senderId === currentUser.id ||
            msg.senderId === currentUser.uid ||
            (firebaseUser ? msg.senderId === firebaseUser.uid : false) ||
            (Boolean(msg.senderName) && Boolean(currentUser.name) && msg.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              {/* Partner Sender Name */}
              {!isMe && (
                <span className="text-[10px] text-slate-500 font-bold mb-0.5 ml-2">
                  {msg.senderName || partnerUser.name}
                </span>
              )}

              {/* Replying context preview */}
              {msg.replyTo && (
                <div
                  className={`text-[10px] px-3 py-1 rounded-t-xl max-w-[75%] border-l-2 bg-slate-200/70 text-slate-600 truncate mb-[-4px] ${
                    isMe ? 'border-rose-500' : 'border-slate-400'
                  }`}
                >
                  <span className="font-bold">{msg.replyTo.senderName}: </span>
                  <span>{msg.replyTo.text}</span>
                </div>
              )}

              {/* Message Bubble Container */}
              <div className="relative max-w-[82%]">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Image Payload */}
                  {msg.mediaType === 'image' && msg.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black/5">
                      <img
                        src={msg.mediaUrl}
                        alt="attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Video Payload */}
                  {msg.mediaType === 'video' && msg.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-60 bg-black">
                      <video
                        src={msg.mediaUrl}
                        controls
                        playsInline
                        className="w-full max-h-60 object-contain rounded-xl"
                      />
                    </div>
                  )}

                  {/* Voice Note Payload */}
                  {msg.mediaType === 'voice' && (
                    <div className="py-1">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePlayVoice(msg)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer ${
                            isMe
                              ? playingMessageId === msg.id
                                ? 'bg-white text-rose-600 ring-2 ring-white/50 animate-pulse'
                                : 'bg-white/25 text-white hover:bg-white/35'
                              : playingMessageId === msg.id
                              ? 'bg-rose-600 text-white ring-2 ring-rose-200 animate-pulse'
                              : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                          }`}
                          title={playingMessageId === msg.id ? 'Pause voice message' : 'Play voice message'}
                        >
                          {playingMessageId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-[130px]">
                          {/* Animated & interactive Waveform Bars */}
                          <div
                            onClick={() => handleTogglePlayVoice(msg)}
                            className="flex items-center gap-1 h-6 cursor-pointer py-1"
                            title="Click to play / pause voice message"
                          >
                            {[10, 16, 22, 14, 24, 18, 28, 16, 20, 12, 18, 14].map((barHeight, idx) => {
                              const barPct = (idx / 12) * 100;
                              const isPast = playingMessageId === msg.id && barPct <= playbackPercent;
                              const isCurrentPlaying = playingMessageId === msg.id;

                              return (
                                <span
                                  key={idx}
                                  style={{ height: `${barHeight}px` }}
                                  className={`w-1 rounded-full transition-all duration-150 ${
                                    isCurrentPlaying
                                      ? isPast
                                        ? isMe
                                          ? 'bg-white shadow-xs scale-y-110'
                                          : 'bg-rose-600 scale-y-110'
                                        : isMe
                                        ? 'bg-white/40'
                                        : 'bg-rose-200'
                                      : isMe
                                      ? 'bg-white/80'
                                      : 'bg-slate-300'
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Time & Duration Info */}
                          <div
                            className={`flex items-center justify-between text-[10px] mt-0.5 font-medium ${
                              isMe ? 'text-rose-100' : 'text-slate-500'
                            }`}
                          >
                            <span>
                              {playingMessageId === msg.id
                                ? `0:${String(Math.floor(playbackTime)).padStart(2, '0')} / 0:${String(
                                    msg.voiceDurationSec || 4
                                  ).padStart(2, '0')}`
                                : `0:${String(msg.voiceDurationSec || 4).padStart(2, '0')}`}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] opacity-90">
                              <Volume2 className="w-2.5 h-2.5" />
                              {playingMessageId === msg.id ? 'Playing...' : 'Voice note'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Love Tap Payload */}
                  {msg.mediaType === 'love_tap' && (
                    <button
                      type="button"
                      onClick={() => playLoveTapChime()}
                      className="flex items-center gap-2 font-bold py-0.5 text-left cursor-pointer hover:opacity-90 transition active:scale-95"
                      title="Tap to hear love chime!"
                    >
                      <Heart className="w-4 h-4 fill-current text-white animate-bounce" />
                      <span>{msg.text}</span>
                    </button>
                  )}

                  {/* Call Log Payload */}
                  {(msg.type === 'call' || msg.mediaType === 'call') && (
                    <div className="py-1">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isMe ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {msg.callData?.mode === 'video' ? (
                            <Video className="w-4.5 h-4.5" />
                          ) : (
                            <Phone className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-[110px]">
                          <div className="font-bold text-xs sm:text-sm leading-tight flex items-center gap-1">
                            <span>{msg.callData?.mode === 'video' ? 'Video Call' : 'Voice Call'}</span>
                            {msg.callData?.status === 'missed' && (
                              <span className="text-[10px] text-red-300 font-normal">Missed</span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] font-medium mt-0.5 ${
                              isMe ? 'text-rose-100' : 'text-slate-500'
                            }`}
                          >
                            {msg.callData?.durationSec && msg.callData.durationSec > 0
                              ? `Duration: ${Math.floor(msg.callData.durationSec / 60)}m ${
                                  msg.callData.durationSec % 60
                                }s`
                              : msg.text}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartCall(msg.callData?.mode || 'voice')}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
                            isMe
                              ? 'bg-white text-rose-600 hover:bg-rose-50'
                              : 'bg-rose-600 text-white hover:bg-rose-700'
                          }`}
                          title={`Call back with ${msg.callData?.mode || 'voice'}`}
                        >
                          Call Back
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg.id)}
                          className={`p-1 rounded-lg transition active:scale-90 opacity-70 hover:opacity-100 cursor-pointer ${
                            isMe ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-red-500'
                          }`}
                          title="Delete call log from chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Normal Text */}
                  {msg.mediaType !== 'love_tap' && msg.mediaType !== 'call' && msg.type !== 'call' && (
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  )}

                  {/* Time & Read Status */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      isMe ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    <span>
                      {new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(msg.createdAt))}
                    </span>

                    {isMe && (
                      <span
                        className="flex items-center gap-0.5"
                        title={
                          msg.status === 'read' || (msg.readBy && msg.readBy.length > 1)
                            ? 'Read by partner'
                            : msg.status === 'delivered'
                            ? 'Delivered to cloud'
                            : 'Sent'
                        }
                      >
                        {msg.status === 'read' || (msg.readBy && msg.readBy.length > 1) ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-white" />
                            <span className="text-[9px] font-bold text-white/95 ml-0.5">Read</span>
                          </>
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3 text-rose-200/80" />
                        ) : (
                          <Check className="w-3 h-3 text-rose-200/80" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions Display */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div
                    className={`flex items-center gap-1 mt-[-6px] px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs ${
                      isMe ? 'mr-1' : 'ml-1'
                    }`}
                  >
                    {msg.reactions.map((r: MessageReaction, i: number) => (
                      <span key={i} className="leading-none">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Hover toolbar: Reply, React, Delete */}
                <div
                  className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-full shadow-md border border-slate-200 text-xs z-10 ${
                    isMe ? 'right-full mr-2' : 'left-full ml-2'
                  }`}
                >
                  <button
                    onClick={() => toggleMessageReaction(msg.id, '❤️')}
                    className="hover:scale-125 transition"
                    title="React Heart"
                  >
                    ❤️
                  </button>
                  <button
                    onClick={() => toggleMessageReaction(msg.id, '🥰')}
                    className="hover:scale-125 transition"
                    title="React Loved"
                  >
                    🥰
                  </button>
                  <button
                    onClick={() => toggleMessageReaction(msg.id, '🤗')}
                    className="hover:scale-125 transition"
                    title="React Hug"
                  >
                    🤗
                  </button>
                  <button
                    onClick={() => setReplyTarget(msg)}
                    className="text-slate-500 hover:text-slate-800 p-0.5"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  {(isMe || msg.type === 'call' || msg.mediaType === 'call') && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="text-red-400 hover:text-red-600 p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Partner Typing Animation */}
        {isPartnerTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-2xl w-fit shadow-xs border border-slate-100">
            <span className="font-semibold text-rose-600">{partnerUser.name}</span> is typing
            <span className="flex gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying Banner */}
      {replyTarget && (
        <div className="bg-rose-50 px-4 py-2 border-t border-rose-200 flex items-center justify-between text-xs text-rose-900 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">
              Replying to <strong>{replyTarget.senderName}:</strong> {replyTarget.text}
            </span>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="p-1 text-rose-600 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Active Banner */}
      {isRecordingVoice && (
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-2.5 flex items-center justify-between text-xs shrink-0 shadow-md">
          <div className="flex items-center gap-3 font-semibold">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span>Recording Voice: {recordSeconds}s</span>

            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center gap-1 h-5 px-2 py-0.5 bg-black/20 rounded-md">
              {[0.4, 0.7, 1.0, 0.6, 0.8, 0.5, 0.9, 0.3].map((mult, idx) => {
                const dynamicHeight = Math.max(4, Math.min(18, Math.round(recordingAudioLevel * 20 * mult + 4)));
                return (
                  <span
                    key={idx}
                    style={{ height: `${dynamicHeight}px` }}
                    className="w-1 bg-white rounded-full transition-all duration-75"
                  />
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium cursor-pointer transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              className="px-3.5 py-1.5 rounded-xl bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer transition active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Emoji Bar (Collapsible) */}
      {showEmojiPicker && (
        <div className="bg-white border-t border-rose-100 p-2.5 grid grid-cols-6 gap-2 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInputVal((prev) => prev + emoji)}
              className="text-xl p-1.5 hover:bg-rose-50 rounded-xl transition text-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Non-blocking cloud sync notice for demo/local mode */}
      {!firebaseUser && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 px-3.5 py-1.5 border-t border-rose-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px] truncate">
            <span>✨</span>
            <span className="truncate">Instant local chat active. Sign in to sync across separate devices in real time.</span>
          </div>
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition active:scale-95 cursor-pointer shrink-0 ml-2"
          >
            Sign in
          </button>
        </div>
      )}

      {/* The Chat Input Form is ALWAYS rendered and functional! */}
      <form
        onSubmit={handleSendText}
        className="bg-white/95 backdrop-blur-md px-2.5 sm:px-4 py-2 sm:py-3 border-t border-rose-100 flex items-center gap-1 sm:gap-2 shrink-0 z-20"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition cursor-pointer tap-bounce ${
            showEmojiPicker ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:text-rose-600'
          }`}
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Photo/Video Picker Button */}
        <label
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer tap-bounce"
          title="Share photo or video"
        >
          <Camera className="w-5 h-5" />
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const res = await readFileAsDataUrl(file);
                  setImageUrlInput(res.url);
                  setMediaType(res.type);
                  setMediaFileName(res.fileName);
                  setShowImageModal(true);
                } catch (err) {
                  console.error(err);
                }
              }
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={isRecordingVoice ? stopAndSendVoiceRecording : startVoiceRecording}
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition cursor-pointer tap-bounce ${
            isRecordingVoice ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-rose-600'
          }`}
          title="Voice Note"
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Message as ${currentUser.name}...`}
          className="flex-1 min-w-0 bg-slate-100/90 text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition border border-transparent placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={!inputVal.trim() || isSending}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-35 text-white shadow-xs transition active:scale-95 flex items-center justify-center shrink-0 cursor-pointer tap-bounce"
          title={isSending ? 'Sending message...' : 'Send message'}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Photo & Video Share Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Share {mediaType === 'video' ? 'Video 🎬' : 'Photo 📸'} Across Distance
              </h3>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrlInput('');
                  setMediaFileName('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mt-3">
              {/* Media File Preview & Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Selected {mediaType === 'video' ? 'Video' : 'Photo'}
                </label>

                {imageUrlInput ? (
                  <div className="relative rounded-2xl overflow-hidden border border-rose-200 bg-black/5 p-2">
                    <div className="max-h-48 overflow-hidden rounded-xl bg-black flex items-center justify-center">
                      {mediaType === 'video' ? (
                        <video
                          src={imageUrlInput}
                          controls
                          playsInline
                          className="max-h-48 w-full object-contain"
                        />
                      ) : (
                        <img
                          src={imageUrlInput}
                          alt="Preview"
                          className="max-h-48 w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[11px] font-medium text-slate-700 truncate max-w-[200px]">
                        {mediaFileName || (mediaType === 'video' ? 'Video selected' : 'Photo selected')}
                      </span>
                      <label className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 font-semibold">
                        <span>Change</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const res = await readFileAsDataUrl(file);
                                setImageUrlInput(res.url);
                                setMediaType(res.type);
                                setMediaFileName(res.fileName);
                              } catch (err) {
                                console.error(err);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center p-4 border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl bg-rose-50/40 hover:bg-rose-50/70 transition group">
                    <div className="flex items-center gap-2 text-rose-500 mb-1 group-hover:scale-105 transition">
                      <Camera className="w-5 h-5" />
                      <Video className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Choose Photo or Video from Device
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP, MP4, MOV
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const res = await readFileAsDataUrl(file);
                            setImageUrlInput(res.url);
                            setMediaType(res.type);
                            setMediaFileName(res.fileName);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Sweet Caption (optional)
                </label>
                <input
                  type="text"
                  placeholder="Thinking of you right here..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Sample Preset Photos as optional quick demo */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Or pick a romantic sample:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      label: 'Sunset Sky 🌅',
                      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
                    },
                    {
                      label: 'Coffee ☕',
                      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
                    },
                    {
                      label: 'Airport ✈️',
                      url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setImageUrlInput(preset.url);
                        setMediaType('image');
                        setMediaFileName(preset.label);
                        setImageCaption(`Here is our ${preset.label} today ❤️`);
                      }}
                      className="p-1 rounded-xl border border-slate-200 hover:border-rose-400 text-[10px] font-semibold text-slate-700 text-center truncate bg-slate-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendMedia}
                disabled={!imageUrlInput.trim()}
                className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-xs transition"
              >
                Send {mediaType === 'video' ? 'Video' : 'Photo'} to {partnerUser.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Microphone Permission & Test Modal */}
      <MicrophonePermissionModal
        isOpen={showMicPermissionModal}
        onClose={() => setShowMicPermissionModal(false)}
        onPermissionGranted={() => {
          setSendError(null);
        }}
      />

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-3 mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center mb-4">
              <h3 className="text-base font-black text-slate-800">Clear Chat History?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to clear all chat messages between you and <strong className="text-slate-700">{partnerUser.name}</strong>? This will permanently delete all messages for both partners.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearChatMessages();
                    setShowClearConfirmModal(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                disabled={isClearing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear Chat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
