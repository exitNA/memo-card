
export enum WordStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  MASTERED = 'MASTERED',
}

export enum PronunciationType {
  US = 'US',
  UK = 'UK',
}

export interface WordDefinition {
  pos: string; // Part of speech
  meaning: string;
  translation: string; // Chinese translation usually helpful for memory
}

export type HighlightType = 'collocation' | 'idiom' | 'slang';

export interface SentenceHighlight {
  text: string;
  type: HighlightType;
}

export interface ExampleSentence {
  en: string;
  cn: string;
  highlights?: SentenceHighlight[];
}

export interface WordDetails {
  spelling: string;
  ipa: {
    us: string;
    uk: string;
  };
  definitions: WordDefinition[];
  sentences: ExampleSentence[];
  collocations: string[];
  etymology?: string;
  note?: string;
}

export interface WordCardData {
  id: string;
  word: string;
  addedAt: number;
  details: WordDetails | null; // Null if not yet generated
  
  // Ebbinghaus properties
  level: number; // 0 to 7
  nextReviewDate: number; // Timestamp
  lastReviewDate: number; // Timestamp
  status: WordStatus;
  reviewCount: number;
}

export interface DailyStat {
  date: string;
  count: number;
}

export interface UserStats {
  streak: number;
  lastLoginDate: string; // YYYY-MM-DD
  totalWordsLearned: number;
  wordsToday: number;
  history: DailyStat[]; // Array of daily review counts
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_WORD = 'ADD_WORD',
  REVIEW = 'REVIEW',
  WORD_LIST = 'WORD_LIST',
}
