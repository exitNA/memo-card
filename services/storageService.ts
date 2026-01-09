
import { WordCardData, UserStats, WordStatus, UserConfig, WordMemoryState } from '../types';
import { getReviewPriority } from './memoryAlgorithm';

const WORDS_KEY = 'memocurve_words';
const STATS_KEY = 'memocurve_stats';

const DEFAULT_CONFIG: UserConfig = {
  maxDailyReview: 100,
  sessionSize: 10,
  targetRetention: 0.9,
  difficultyPreference: 1.0 // Unused in strict FSRS but kept for type compatibility
};

// Initial state for NEW cards before first rating
export const createInitialMemoryState = (): WordMemoryState => ({
  strength: 0, // 0 indicates never reviewed (New)
  difficulty: 0, // Will be calculated on first rate
  reps: 0,
  lapses: 0,
  consecutiveCorrect: 0,
  lastReviewDate: 0,
  nextReviewDate: Date.now(), // Due immediately
  history: []
});

const getLocalWords = (): WordCardData[] => {
  try {
    const data = localStorage.getItem(WORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalWords = (words: WordCardData[]) => {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
};

export const getWords = async (): Promise<WordCardData[]> => {
  return getLocalWords();
};

export const saveWords = (words: WordCardData[]) => {
  saveLocalWords(words);
};

export const getStats = (): UserStats => {
  const defaultStats: UserStats = {
    streak: 0,
    lastLoginDate: '',
    totalWordsLearned: 0,
    wordsToday: 0,
    history: [],
    config: DEFAULT_CONFIG
  };
  try {
    const data = localStorage.getItem(STATS_KEY);
    const parsed = data ? JSON.parse(data) : defaultStats;
    if (!parsed.config) parsed.config = DEFAULT_CONFIG;
    return parsed;
  } catch (e) {
    return defaultStats;
  }
};

export const saveStats = (stats: UserStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const checkIn = (): UserStats => {
  const stats = getStats();
  const today = new Date().toISOString().split('T')[0];
  
  if (!stats.history) stats.history = [];

  if (stats.lastLoginDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (stats.lastLoginDate === yesterday) {
      stats.streak += 1;
    } else if (stats.lastLoginDate === '') {
      stats.streak = 1; 
    } else {
      stats.streak = 1;
    }
    stats.lastLoginDate = today;
    stats.wordsToday = 0;
    if (!stats.history.find(h => h.date === today)) {
        stats.history.push({ date: today, count: 0 });
    }
    // KEEP LAST 365 DAYS for Heatmap
    if (stats.history.length > 365) stats.history = stats.history.slice(-365);
    saveStats(stats);
  }
  return stats;
};

/**
 * Get Due Words Sorted by Priority (FSRS Retention)
 */
export const getDueWordsList = (words: WordCardData[], config: UserConfig): WordCardData[] => {
  const now = Date.now();
  
  // 1. Filter Due
  const due = words.filter(w => w.memory.nextReviewDate <= now);
  
  // 2. Sort: FSRS prioritizes lowest R (Retention) first
  // Note: New cards (reps=0) usually have priority, or mixed. 
  // calculateRetention returns 0 for new cards, making them high priority (1 - 0 = 1).
  // But we might want Learning cards first.
  
  return due
    .sort((a, b) => getReviewPriority(b, now) - getReviewPriority(a, now)) // Descending Priority
    .slice(0, config.maxDailyReview);
};
