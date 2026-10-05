import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*, geolocation=*, camera=*');
  next();
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const COMPANION_SYSTEM_PROMPT = `
You are the "Love Companion", a warm, emotionally supportive, mindful AI relationship assistant designed specifically for couples in long-distance relationships.

CRITICAL ETHICAL & SAFETY RULES:
- You are a SUPPORTIVE RELATIONSHIP ASSISTANT, NEVER a romantic partner or replacement for either person.
- Never flirt with the user or accept romantic advances. Gently redirect them to cherish and communicate with their real-life partner.
- Do not encourage emotional dependency on the AI.
- Do not manipulate users or take sides in conflicts.
- Do not make accusations about cheating, infidelity, or relationship failure.
- Never diagnose mental health conditions or pretend to know how a person feels beyond what they share.
- Never make relationship decisions for the couple (e.g. "you should break up" or "you must move now").
- Encourage direct, vulnerable, healthy communication between the two partners.
- Celebrate their love, resilience across time zones, and the beauty of choosing each other despite the miles.
`;

async function generateGeminiContent(options: {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: options.contents,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        temperature: options.temperature,
      },
    });
  } catch (err: any) {
    console.warn('Primary model busy, attempting secondary model:', err?.message || err);
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: options.contents,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        temperature: options.temperature,
      },
    });
  }
}

const router = express.Router();

// 1. General Love Companion Chat & Suggestions
router.post('/companion', async (req, res) => {
  const { prompt, partnerName, userName, timeDifferenceHours, userMood, partnerMood } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const contextSnippet = `
Couple Context:
- User: ${userName || 'User'}
- Partner: ${partnerName || 'Partner'}
- Time difference: ${timeDifferenceHours !== undefined ? `${timeDifferenceHours} hours` : 'Unknown'}
- User's current mood: ${userMood || 'Not specified'}
- Partner's current mood: ${partnerMood || 'Not specified'}
`;

  try {
    const response = await generateGeminiContent({
      contents: `${contextSnippet}\nUser Request: ${prompt}`,
      systemInstruction: COMPANION_SYSTEM_PROMPT,
      temperature: 0.7,
    });

    const reply = response.text || "Love is strengthened in every conscious choice to reach across the distance. Tell them what you appreciate about them today.";
    return res.json({ reply });
  } catch (error: any) {
    console.warn('Gemini companion transient error, sending supportive fallback:', error?.message);
    const supportiveFallbacks = [
      `Distance is merely physical when two hearts stay intentional. Consider sending ${partnerName || 'your partner'} a 30-second voice note letting them know what you miss most about their laugh right now.`,
      `When schedules get hectic, simple micro-connections make the biggest difference. Why not send a quick photo of your coffee cup or sunset right now with the message: "Thinking of you across the miles"?`,
      `A great prompt for tonight: "What was the happiest 5 minutes of your day today?" It shifts the conversation away from the fatigue of distance and invites you both into each other's day.`,
    ];
    const randomReply = supportiveFallbacks[Math.floor(Math.random() * supportiveFallbacks.length)];
    return res.json({ reply: randomReply });
  }
});

// 2. Virtual Date Generator
router.post('/date-planner', async (req, res) => {
  try {
    const { availableMinutes, vibe, timezoneGap } = req.body;

    const prompt = `Generate 3 creative, heartwarming virtual date ideas for a long-distance couple.
Available time: ${availableMinutes || 30} minutes.
Desired vibe: ${vibe || 'romantic and relaxed'}.
Timezone difference: ${timezoneGap || 'different time zones'}.

Format as JSON with an array named "ideas", where each item has:
- title (catchy, 3-6 words)
- description (2-3 sentences explaining the activity)
- prepItems (list of 2-3 simple things to prepare beforehand, like snacks or apps)
- connectionPrompt (one special question to ask each other during the date)
- iconEmoji (one relevant emoji)
`;

    const response = await generateGeminiContent({
      contents: prompt,
      systemInstruction: COMPANION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      temperature: 0.8,
    });

    const text = response.text || '{"ideas": []}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ideas: [] };
    }

    return res.json(data);
  } catch (error: any) {
    console.warn('Gemini date-planner fallback:', error?.message);
    return res.json({
      ideas: [
        {
          title: 'Synchronized Tea & Sunset Call',
          description: 'Brew your favorite hot drink, sit by the window on video, and describe three details of your view.',
          prepItems: ['Hot beverage', 'Earphones', 'Quiet corner'],
          connectionPrompt: 'What made you laugh out loud today?',
          iconEmoji: '☕',
        },
        {
          title: '3-Song Silent Dance Party',
          description: 'Put on matching headphones, press play on the same song at the same second, and dance in your rooms.',
          prepItems: ['Shared playlist track', 'Phone tripod or shelf'],
          connectionPrompt: 'Which concert will we go to first once we live together?',
          iconEmoji: '💃',
        },
      ],
    });
  }
});

// 3. Thoughtful Message & Love Note Crafting
router.post('/craft-note', async (req, res) => {
  try {
    const { partnerName, occasion, tone, notePrompt } = req.body;

    const prompt = `Help craft 3 sweet, heart-touching message options for my long distance partner named ${partnerName || 'my love'}.
Occasion/Context: ${occasion || 'Thinking of you'}
Desired Tone: ${tone || 'warm and heartfelt'} (e.g., romantic, encouraging, playful, comforting)
Specific thought: ${notePrompt || 'I miss their smile today'}

Return a JSON array of strings called "messages", each between 20 and 70 words, feeling natural, genuine, and romantic without sounding like robotic corporate poetry.`;

    const response = await generateGeminiContent({
      contents: prompt,
      systemInstruction: COMPANION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      temperature: 0.85,
    });

    const text = response.text || '{"messages": []}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { messages: [] };
    }

    return res.json(data);
  } catch (error: any) {
    console.warn('Gemini craft-note fallback:', error?.message);
    const partner = req.body.partnerName || 'my love';
    return res.json({
      messages: [
        `Good morning ${partner}! Just wanted you to wake up to a reminder that you are so deeply loved, cherished, and admired. Wishing you the smoothest day ahead. ❤️`,
        `Every hour that passes is one hour closer to holding you at the airport gate. Thank you for being my anchor across all these miles. Thinking of you always!`,
        `Sending you the warmest hug across the time zones. No matter how busy today gets, know that my heart is holding yours right now.`,
      ],
    });
  }
});

// 4. Couple Games Questions Generator
router.post('/game-questions', async (req, res) => {
  try {
    const { gameType } = req.body;

    const prompt = `Provide 10 questions for a long distance couple game of type: "${gameType || 'deep_questions'}".
Requirements:
- Deeply engaging, sweet, fun, respectful.
- Specifically attuned to long distance relationships, memories, future dreams together, and playful romance.
- Return a JSON object with a key "questions" containing an array of strings. For "would_you_rather", format each item as "Would you rather [A] or [B]?". For "this_or_that", format as "[Choice A] vs [Choice B]".`;

    const response = await generateGeminiContent({
      contents: prompt,
      systemInstruction: COMPANION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      temperature: 0.9,
    });

    const text = response.text || '{"questions": []}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { questions: [] };
    }

    return res.json(data);
  } catch (error: any) {
    console.warn('Gemini game questions fallback:', error?.message);
    return res.json({
      questions: [
        'Would you rather receive 5 handwritten letters or 1 spontaneous surprise visit?',
        'What was the exact second you realized you were deeply in love with me?',
        'Late Night Deep Talks vs Early Morning Video Calls',
        'Which city in the world should be our first destination once we close the distance?',
      ],
    });
  }
});

// Support both /api/gemini and /gemini path prefixes
app.use('/api/gemini', router);
app.use('/gemini', router);

export default app;
