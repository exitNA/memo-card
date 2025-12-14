// Ebbinghaus Intervals in Minutes
// Level 0: New
// Level 1: 1 day (1440 min)
// Level 2: 2 days
// Level 3: 4 days
// Level 4: 7 days
// Level 5: 15 days
// Level 6: 30 days
// Level 7: Mastered

export const EBBINGHAUS_INTERVALS_DAYS = [0, 1, 2, 4, 7, 15, 30];

// In milliseconds
export const INTERVALS_MS = EBBINGHAUS_INTERVALS_DAYS.map(days => days * 24 * 60 * 60 * 1000);

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
