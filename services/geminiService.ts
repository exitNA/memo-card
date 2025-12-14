import { GoogleGenAI, Modality } from '@google/genai';
import { GEMINI_TTS_MODEL, API_BASE_URL } from '../constants';
import { WordDetails } from '../types';

// Keep the client-side TTS for now as it's efficient, 
// or move to backend if strictly required (but not requested explicitly).
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWordDetails = async (word: string): Promise<WordDetails> => {
  try {
    // Call the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
    });

    if (!response.ok) {
        throw new Error(`Backend API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as WordDetails;

  } catch (e) {
    console.error("Backend generation failed:", e);
    // Optional: Fallback to client-side generation if you wanted to keep it,
    // but the request is to use the backend/OpenAI-compatible models.
    throw new Error("无法连接到后端服务生成单词，请确保 server.py 正在运行。");
  }
};

export const generatePronunciation = async (text: string, voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr' = 'Kore'): Promise<string> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
        model: GEMINI_TTS_MODEL,
        contents: {
        parts: [{ text: text }] // Just read the text
        },
        config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
            }
        }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned");
    }
    return base64Audio;
  } catch (e) {
      console.error("TTS Generation failed", e);
      throw e;
  }
};
