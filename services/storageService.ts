
import { WordCardData, UserStats, WordStatus } from '../types';

const WORDS_KEY = 'memocurve_words';
const STATS_KEY = 'memocurve_stats';

// --- Local Storage Helpers ---
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

// --- Main Service Methods ---

export const getWords = async (): Promise<WordCardData[]> => {
  // Always use local storage in this serverless configuration
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
    
    const todayEntry = stats.history.find(h => h.date === today);
    if (!todayEntry) {
        stats.history.push({ date: today, count: 0 });
    }
    
    if (stats.history.length > 14) {
        stats.history = stats.history.slice(stats.history.length - 14);
    }
    
    saveStats(stats);
  } else {
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
    if (w.status === WordStatus.MASTERED) return false;
    return w.nextReviewDate <= now;
  }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
};
