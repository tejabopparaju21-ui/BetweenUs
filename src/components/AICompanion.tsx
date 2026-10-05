/**
 * AI Love Companion Component
 * Backed by Gemini API on server.ts
 * Strictly abides by supportive companion rules without romantic substitution or emotional dependency.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Send,
  Calendar,
  Heart,
  MessageSquare,
  Coffee,
  HelpCircle,
  Copy,
  Check,
  Compass,
  Smile,
  ShieldCheck,
  Bot,
  Flame,
} from 'lucide-react';

export const AICompanion: React.FC = () => {
  const { currentUser, partnerUser, addVirtualDate, sendMessage } = useApp();

  const [activeCategory, setActiveCategory] = useState<'chat' | 'dates' | 'notes' | 'reconnect'>('chat');
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Dedicated generator states
  const [dateMinutes, setDateMinutes] = useState(30);
  const [generatedDateIdeas, setGeneratedDateIdeas] = useState<any[]>([]);
  const [craftedNotes, setCraftedNotes] = useState<string[]>([]);
  const [noteOccasion, setNoteOccasion] = useState('Missing you today');
  const [noteTone, setNoteTone] = useState('heartfelt and comforting');

  // 1. General Companion Ask / Chat
  const handleAskCompanion = async (customPrompt?: string) => {
    const textToSend = customPrompt || promptInput;
    if (!textToSend.trim() || isLoading) return;

    setIsLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/gemini/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          userName: currentUser.name,
          partnerName: partnerUser.name,
          userMood: currentUser.currentMoodId,
          partnerMood: partnerUser.currentMoodId,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setAiResponse(data.reply);
      } else if (data.error) {
        setAiResponse(`Notice: ${data.error}`);
      }
    } catch (err) {
      setAiResponse(
        "I'm here to support your relationship with ideas, prompts, and sweet words. What would you like to plan for you and your partner today?"
      );
    } finally {
      setIsLoading(false);
      setPromptInput('');
    }
  };

  // 2. Generate Virtual Dates with Gemini
  const handleGenerateDates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/date-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableMinutes: dateMinutes,
          vibe: 'cozy, romantic, and thoughtful',
          timezoneGap: `${currentUser.timeZone} vs ${partnerUser.timeZone}`,
        }),
      });
      const data = await res.json();
      if (data.ideas && data.ideas.length > 0) {
        setGeneratedDateIdeas(data.ideas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Craft Sweet Notes / Messages
  const handleCraftNotes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/craft-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: partnerUser.name,
          occasion: noteOccasion,
          tone: noteTone,
          notePrompt: promptInput || `Let ${partnerUser.name} know they are in my thoughts across the miles`,
        }),
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setCraftedNotes(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyNote = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendToChat = (text: string) => {
    sendMessage(text);
    alert('Message sent directly to private couple chat!');
  };

  const handleSaveToDatePlanner = (idea: any) => {
    addVirtualDate({
      title: idea.title,
      description: idea.description,
      category: 'AI Recommended',
      durationMinutes: dateMinutes,
      prepItems: idea.prepItems || ['Snacks', 'Video call'],
      connectionPrompt: idea.connectionPrompt || 'Ask about their day',
      iconEmoji: idea.iconEmoji || '❤️',
    });
    alert(`"${idea.title}" saved to your Virtual Dates planner!`);
  };

  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto px-3.5 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 rounded-[24px] p-4 sm:p-5 text-white shadow-lg shadow-rose-500/15 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">Love Companion</h2>
              <span className="text-[9px] bg-white/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Supportive AI
              </span>
            </div>
            <p className="text-xs text-rose-100 font-medium mt-0.5">
              Thoughtful ideas to nurture your connection across the distance
            </p>
          </div>
        </div>

        {/* Ethical Transparency Note */}
        <div className="mt-3 pt-2.5 border-t border-white/20 flex items-start gap-2 text-[10px] sm:text-[11px] text-rose-100/90 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-200 mt-0.5" />
          <span>
            <strong>Mindful Guardrails:</strong> The Love Companion is an idea assistant, NOT a romantic replacement. All suggestions are designed to encourage communication with {partnerUser.name}.
          </span>
        </div>
      </div>

      {/* Feature Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-slate-100/90 rounded-2xl text-[11px] sm:text-xs font-semibold">
        <button
          onClick={() => setActiveCategory('chat')}
          className={`py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeCategory === 'chat'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Companion
        </button>
        <button
          onClick={() => setActiveCategory('dates')}
          className={`py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeCategory === 'dates'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Date Ideas
        </button>
        <button
          onClick={() => setActiveCategory('notes')}
          className={`py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeCategory === 'notes'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Love Notes
        </button>
        <button
          onClick={() => setActiveCategory('reconnect')}
          className={`py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeCategory === 'reconnect'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Deep Sparks
        </button>
      </div>

      {/* Tab 1: Freeform Companion Assistant */}
      {activeCategory === 'chat' && (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Quick Suggestions Cards */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 px-1">
              Tap a spark for quick inspiration:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  icon: '💡',
                  title: 'You both have 70 minutes free tonight',
                  prompt: 'We both have about 70 minutes free tonight across our timezones. Give us 2 fun, creative virtual date ideas we can do together right away!',
                },
                {
                  icon: '💌',
                  title: `Sweet comforting note for ${partnerUser.name}`,
                  prompt: `Help me write a heartfelt 2-sentence note to let ${partnerUser.name} know I am thinking of them across the miles.`,
                },
                {
                  icon: '✨',
                  title: 'Deep question for our late-night call',
                  prompt: 'Give us a thoughtful, deep question to spark meaningful conversation about our dreams and relationship.',
                },
                {
                  icon: '☕',
                  title: 'How to stay close during a busy work week',
                  prompt: 'We are both having an intensely busy work week in different cities. What are 3 micro-rituals to keep our emotional bond strong?',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskCompanion(item.prompt)}
                  className="p-3 rounded-2xl bg-white hover:bg-rose-50/60 border border-rose-100 shadow-2xs hover:border-rose-200 text-left transition tap-bounce active:scale-[0.98] cursor-pointer flex items-center gap-2.5 group"
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 block truncate group-hover:text-rose-600">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">Tap to ask companion</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Response Display */}
          {aiResponse && (
            <div className="p-4 rounded-[22px] bg-rose-50/80 border border-rose-200/90 text-xs text-slate-800 space-y-2.5 animate-in fade-in shadow-2xs">
              <div className="flex items-center justify-between font-bold text-rose-700 pb-1.5 border-b border-rose-200/60">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4" />
                  <span>Companion's Supportive Guidance</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendToChat(aiResponse)}
                  className="px-2 py-0.5 rounded-lg bg-white text-rose-600 hover:bg-rose-100 font-bold text-[10px] border border-rose-200 cursor-pointer shadow-2xs"
                >
                  Send to Chat
                </button>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}

          {/* Input Bar */}
          <div className="bg-white p-2.5 rounded-2xl border border-rose-200/90 shadow-sm flex items-center gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskCompanion()}
              placeholder="Ask for advice, sweet words, or date concepts..."
              className="flex-1 min-w-0 text-xs sm:text-sm px-2.5 py-1 focus:outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => handleAskCompanion()}
              disabled={isLoading || !promptInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-35 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition tap-bounce active:scale-95 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Thinking...' : 'Ask'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Virtual Date Planner */}
      {activeCategory === 'dates' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-rose-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Compass className="w-4 h-4 text-rose-600" />
              <span>Tailored Virtual Date Generator</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select how much free time you both have across your timezones ({currentUser.timeZone.split('/')[1]} & {partnerUser.timeZone.split('/')[1]}).
            </p>

            <div className="flex items-center gap-2 pt-1">
              {[15, 30, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDateMinutes(mins)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    dateMinutes === mins
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateDates}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs shadow-xs transition"
            >
              {isLoading ? 'Generating Ideas...' : `Generate ${dateMinutes}-Min Date Ideas 💡`}
            </button>
          </div>

          {/* Generated Ideas List */}
          {generatedDateIdeas.map((idea, idx) => (
            <div
              key={idx}
              className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{idea.iconEmoji || '❤️'}</span>
                  <h4 className="font-bold text-sm text-slate-800">{idea.title}</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold shrink-0">
                  {dateMinutes} mins
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{idea.description}</p>
              {idea.connectionPrompt && (
                <div className="p-2.5 rounded-xl bg-rose-50/70 text-[11px] text-rose-900 border border-rose-100">
                  <strong>💬 Connection Question: </strong>"{idea.connectionPrompt}"
                </div>
              )}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSaveToDatePlanner(idea)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition"
                >
                  Save to Date Planner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Thoughtful Love Notes Helper */}
      {activeCategory === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-rose-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-rose-600" />
              <span>Thoughtful Message & Note Crafter</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Occasion</label>
              <select
                value={noteOccasion}
                onChange={(e) => setNoteOccasion(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="Good morning across the miles">Good morning across the miles ☀️</option>
                <option value="Good night & sweet dreams">Good night & sweet dreams 🌙</option>
                <option value="Encouragement for an exam or big work presentation">
                  Partner has exam or big work day 📚
                </option>
                <option value="Missing you deeply today">Missing you deeply today ❤️</option>
                <option value="Comfort after a stressful day">Comfort after a stressful day 🫂</option>
                <option value="Countdown excitement for our upcoming flight">
                  Countdown excitement for reunion ✈️
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tone</label>
              <select
                value={noteTone}
                onChange={(e) => setNoteTone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="heartfelt and comforting">Heartfelt & Comforting</option>
                <option value="deeply romantic and poetic">Deeply Romantic</option>
                <option value="playful and cheering">Playful & Cheering</option>
                <option value="encouraging and empowering">Empowering & Supportive</option>
              </select>
            </div>

            <button
              onClick={handleCraftNotes}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
            >
              {isLoading ? 'Crafting Heartfelt Words...' : `Craft 3 Messages for ${partnerUser.name} ✨`}
            </button>
          </div>

          {/* Generated Notes Display */}
          {craftedNotes.map((msg, idx) => (
            <div
              key={idx}
              className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm space-y-3"
            >
              <p className="text-xs text-slate-700 italic leading-relaxed">"{msg}"</p>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-50">
                <button
                  onClick={() => handleCopyNote(msg, idx)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSendToChat(msg)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send in Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Deep Connection Sparks */}
      {activeCategory === 'reconnect' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-200 space-y-2">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>36 Deep Questions for Long Distance Couples</span>
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Spark intimate vulnerability and rediscover new facets of each other. Take turns asking one tonight.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              "What is one quiet moment with me that you replay in your mind when you miss me?",
              "What is a lesson our long distance has taught you about our resilience as a team?",
              "When you imagine our morning routine living under the same roof, what does it look like?",
              "What makes you feel most loved by me even across continents?",
              "What is a personal fear you've overcome since we fell in love?",
              "If we had a completely unscheduled 48 hours together in any cabin in the world, what are we doing?",
            ].map((q, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs flex items-start justify-between gap-3 text-xs text-slate-800"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="font-medium leading-relaxed">{q}</span>
                </div>
                <button
                  onClick={() => handleSendToChat(`💬 Tonight's Question: "${q}"`)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                  title="Send to chat"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
