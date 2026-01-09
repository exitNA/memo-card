
export enum WordStatus {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  MASTERED = 'MASTERED',
}

/**
 * 记忆表现评分 (1-5分)
 * 1: 完全不记得 (Forgotten)
 * 2: 有点印象但想不起来 (Hard/Blurred)
 * 3: 勉强想起 (Good)
 * 4: 清楚记得 (Clear)
 * 5: 瞬间反应 (Easy/Mastered)
 */
export enum RatingScore {
  FAIL = 1,
  HARD = 2,
  GOOD = 3,
  CLEAR = 4,
  EASY = 5
}

export interface WordDefinition {
  pos: string;
  meaning: string;
  translation: string;
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

export interface WordInflections {
  plural?: string;              // 复数
  pastTense?: string;           // 过去式
  pastParticiple?: string;      // 过去分词
  presentParticiple?: string;   // 现在分词
  thirdPersonSingular?: string; // 第三人称单数
}

export interface WordDetails {
  spelling: string;
  ipa: { us: string; uk: string; };
  definitions: WordDefinition[];
  inflections?: WordInflections; // 新增：形态变化
  sentences: ExampleSentence[];
  collocations: string[];
  etymology?: string;
}

/**
 * 用户复习行为记录
 */
export interface ReviewLog {
  score: RatingScore;     // 1-5分
  reviewTime: number;     // 时间戳
  duration: number;       // 复习时长(ms)
  strengthBefore: number; // 复习前的记忆强度
}

/**
 * 单词记忆状态表 (核心记忆参数)
 */
export interface WordMemoryState {
  strength: number;           // 当前记忆强度 (0-100)
  difficulty: number;         // 个性化难度 (1-10)
  reps: number;               // 历史复习总次数
  lapses: number;             // 遗忘总次数
  consecutiveCorrect: number; // 连续正确次数
  lastReviewDate: number;     // 最近复习时间
  nextReviewDate: number;     // 下次最佳复习时间
  history: ReviewLog[];       // 历史记录快照 (最近5次)
}

export interface WordCardData {
  id: string;
  word: string;
  addedAt: number;
  details: WordDetails | null;
  status: WordStatus;
  memory: WordMemoryState;
  level: number; // 0-7 级，根据强度或复习次数计算
}

export interface DailyStat {
  date: string;
  count: number;
}

/**
 * 用户学习配置表
 */
export interface UserConfig {
  maxDailyReview: number;      // 每日最大复习量
  sessionSize: number;         // 单次复习 Batch 大小 (默认 10)
  targetRetention: number;     // 目标记忆留存率 (0.7 - 0.95, 默认 0.9)
  difficultyPreference: number; // 难度系数 (0.5 - 1.5)
}

export interface UserStats {
  streak: number;
  lastLoginDate: string;
  totalWordsLearned: number;
  wordsToday: number;
  history: DailyStat[];
  config: UserConfig;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  REVIEW = 'REVIEW',
  ADD_WORD = 'ADD_WORD',
  WORD_LIST = 'WORD_LIST',
}
