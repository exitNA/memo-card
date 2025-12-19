
// Ebbinghaus Intervals in Minutes
export const EBBINGHAUS_INTERVALS_DAYS = [0, 1, 2, 4, 7, 15, 30];

// In milliseconds
export const INTERVALS_MS = EBBINGHAUS_INTERVALS_DAYS.map(days => days * 24 * 60 * 60 * 1000);

export const GEMINI_TEXT_MODEL = 'gemini-3-flash-preview';
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
