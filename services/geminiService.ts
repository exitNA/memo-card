
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { GEMINI_TEXT_MODEL, GEMINI_TTS_MODEL } from '../constants';
import { WordDetails } from '../types';

// 始终从环境变量获取 API 密钥
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 使用 Gemini 3 Flash 生成详细的单词卡片信息
 */
export const generateWordDetails = async (word: string): Promise<WordDetails> => {
  const ai = getAiClient();
  
  const systemInstruction = `You are a world-class English lexicographer and language teacher. 
  Create a detailed word study card for the given word. 
  
  CRITICAL RULE FOR HIGHLIGHTS:
  In example sentences, you MUST identify common collocations, idioms, or phrasal structures.
  If a structure is discontinuous (meaning other words appear in the middle), use '...' to represent the gap in the 'text' field.
  
  EXAMPLES of 'text' field for highlights:
  - Sentence: "It is too hard to study tonight." -> Highlight text: "too...to"
  - Sentence: "I usually go swimming on weekends." -> Highlight text: "on weekends"
  - Sentence: "Please take my feelings into account." -> Highlight text: "take...into account"
  - Sentence: "They are so busy that they cannot come." -> Highlight text: "so...that"
  
  MANDATORY: When generating sentences for words like 'too', 'weekends', 'so', etc., ensure you include these specific structures as examples.
  
  Types:
  - 'collocation': natural word combinations.
  - 'idiom': non-literal expressions.
  - 'slang': informal language.
  
  Return the result in strictly valid JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `Generate study details for the English word: "${word}". Please prioritize sentences that include common collocations or discontinuous structures (like 'too...to' if 'too' is the word, or 'on weekends' if 'weekends' is the word).`,
      config: {
        systemInstruction,
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
              },
              required: ["us", "uk"]
            },
            definitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pos: { type: Type.STRING, description: "Part of speech" },
                  meaning: { type: Type.STRING, description: "Clear English definition" },
                  translation: { type: Type.STRING, description: "Chinese translation" }
                },
                required: ["pos", "meaning", "translation"]
              }
            },
            sentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING, description: "Natural example sentence" },
                  cn: { type: Type.STRING, description: "Chinese translation" },
                  highlights: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING, description: "The phrase to highlight. Use '...' for gaps." },
                        type: { type: Type.STRING, enum: ["collocation", "idiom", "slang"] }
                      },
                      required: ["text", "type"]
                    }
                  }
                },
                required: ["en", "cn"]
              }
            },
            collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
            etymology: { type: Type.STRING, description: "Brief interesting origin story" }
          },
          required: ["spelling", "ipa", "definitions", "sentences", "collocations"]
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("AI returned empty response");
    
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
