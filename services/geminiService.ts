import { GoogleGenAI, Type, Modality } from '@google/genai';
import { GEMINI_TEXT_MODEL, GEMINI_TTS_MODEL } from '../constants';
import { WordDetails } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWordDetails = async (word: string): Promise<WordDetails> => {
  const ai = getClient();
  
  const prompt = `
    Generate a detailed vocabulary card for the English word "${word}".
    Target audience: Chinese speakers (Mainland China) learning English.
    Return strictly JSON.
    
    Requirements:
    1. **spelling**: Correct spelling (lowercase).
    2. **ipa**: IPA symbols for US and UK pronunciation.
    3. **definitions**: Array of meanings for DIFFERENT parts of speech (POS). Include the English meaning and a concise Simplified Chinese translation.
    4. **sentences**: 3 very common, natural sentences. Prioritize fixed collocations, authentic slang (俚语), and popular pairings. Include Simplified Chinese translation.
    5. **collocations**: List of 3-5 distinct short phrases/idioms/fixed matches using this word.
    6. **etymology**: Brief origin/root explanation in Simplified Chinese (if helpful for memory) or English.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          spelling: { type: Type.STRING },
          ipa: {
            type: Type.OBJECT,
            properties: {
              us: { type: Type.STRING },
              uk: { type: Type.STRING }
            }
          },
          definitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pos: { type: Type.STRING },
                meaning: { type: Type.STRING },
                translation: { type: Type.STRING }
              }
            }
          },
          sentences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                en: { type: Type.STRING },
                cn: { type: Type.STRING }
              }
            }
          },
          collocations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          etymology: { type: Type.STRING }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as WordDetails;
  }
  throw new Error("Failed to generate word details");
};

export const generatePronunciation = async (text: string, voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr' = 'Kore'): Promise<string> => {
  const ai = getClient();
  
  // 'Kore' is typically female/neutral, 'Puck' is typically male-sounding.
  // Gemini TTS voices: Puck, Charon, Kore, Fenrir, Zephyr.
  
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
};