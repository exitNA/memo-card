
import { GoogleGenAI, Modality } from '@google/genai';
import { GEMINI_TEXT_MODEL, GEMINI_TTS_MODEL } from '../constants';
import { WordDetails } from '../types';
import { WORD_ANALYSIS_SYSTEM_PROMPT } from '../prompts';

// 始终从环境变量获取 API 密钥
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 使用 Gemini 3 Flash 生成详细的单词卡片信息
 */
export const generateWordDetails = async (word: string): Promise<WordDetails> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `Analyze the English word: "${word}". If "${word}" is an inflected form (e.g., plural, past tense, comparative), convert it to its LEMMA (base form) and generate details for the base form. Ensure the 'spelling' field matches the base form. Please prioritize sentences that include common collocations or discontinuous structures. Don't forget morphological variations.`,
      config: {
        systemInstruction: WORD_ANALYSIS_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    let text = response.text;
    if (!text) throw new Error("AI returned empty response");
    
    // Clean up markdown code blocks if present (common when using prompts for JSON)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    return JSON.parse(text) as WordDetails;
  } catch (e) {
    console.error("Gemini generation failed:", e);
    throw new Error("AI 生成单词失败。请确认 API Key 是否正确配置且网络畅通。");
  }
};

/**
 * 使用 Gemini TTS 模型生成音频
 */
export const generatePronunciation = async (text: string, voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr' = 'Kore'): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{ parts: [{ text: text }] }],
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
    if (!base64Audio) throw new Error("No audio data returned from Gemini TTS");
    return base64Audio;
  } catch (e) {
    console.error("TTS Generation failed", e);
    throw e;
  }
};
