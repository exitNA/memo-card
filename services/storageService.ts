import { WordCardData, UserStats, WordStatus } from '../types';

const WORDS_KEY = 'memocurve_words';
const STATS_KEY = 'memocurve_stats';

export const getWords = (): WordCardData[] => {
  try {
    const data = localStorage.getItem(WORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load words", e);
    return [];
  }
};

export const saveWords = (words: WordCardData[]) => {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
};

export const getStats = (): UserStats => {
  const defaultStats: UserStats = {
    streak: 0,
    lastLoginDate: '',
    totalWordsLearned: 0,
    wordsToday: 0,
    history: []
  };
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : defaultStats;
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
  
  // Ensure history array exists
  if (!stats.history) stats.history = [];

  if (stats.lastLoginDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (stats.lastLoginDate === yesterday) {
      stats.streak += 1;
    } else {
      stats.streak = 1; // Reset if broken, or first time
    }
    
    stats.lastLoginDate = today;
    stats.wordsToday = 0; // Reset daily counter
    
    // Create today's history entry if not exists
    const todayEntry = stats.history.find(h => h.date === today);
    if (!todayEntry) {
        stats.history.push({ date: today, count: 0 });
    }
    
    // Keep only last 14 days for the chart
    if (stats.history.length > 14) {
        stats.history = stats.history.slice(stats.history.length - 14);
    }
    
    saveStats(stats);
  } else {
      // Ensure current day is in history (edge case for migrations)
      const todayEntry = stats.history.find(h => h.date === today);
      if (!todayEntry) {
          stats.history.push({ date: today, count: stats.wordsToday });
          saveStats(stats);
      }
  }
  
  return stats;
};

export const getDueWords = (words: WordCardData[]): WordCardData[] => {
  const now = Date.now();
  return words.filter(w => {
    // New words or words where nextReviewDate is passed
    if (w.status === WordStatus.MASTERED) return false;
    return w.nextReviewDate <= now;
  }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
};