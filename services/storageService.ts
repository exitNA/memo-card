import { WordCardData, UserStats, WordStatus } from '../types';
import { API_BASE_URL } from '../constants';

const WORDS_KEY = 'memocurve_words';
const STATS_KEY = 'memocurve_stats';

// --- Local Storage Helpers (Offline Fallback) ---
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

// --- API Helpers ---
const fetchWordsFromApi = async (): Promise<WordCardData[]> => {
  const response = await fetch(`${API_BASE_URL}/words`);
  if (!response.ok) throw new Error('API Sync Failed');
  return response.json();
};

const syncWordsToApi = async (words: WordCardData[]) => {
  await fetch(`${API_BASE_URL}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(words)
  });
};

// --- Main Service Methods ---

export const getWords = async (): Promise<WordCardData[]> => {
  try {
    // Try to fetch from backend first
    const remoteWords = await fetchWordsFromApi();
    // Update local cache
    saveLocalWords(remoteWords);
    return remoteWords;
  } catch (e) {
    console.warn("Backend unavailable, using local storage", e);
    return getLocalWords();
  }
};

// Note: In a real app, this should be synchronous for the UI and async for the backend.
// We'll update local immediately and try to sync to backend in background.
export const saveWords = (words: WordCardData[]) => {
  // 1. Save Local (Optimistic UI)
  saveLocalWords(words);
  
  // 2. Sync Remote (Fire and forget, or handle error silently)
  syncWordsToApi(words).catch(e => {
    console.warn("Failed to sync to backend", e);
  });
};

// Stats remain local for this demo, or could be moved to backend similarly
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
    if (w.status === WordStatus.MASTERED) return false;
    return w.nextReviewDate <= now;
  }).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
};
