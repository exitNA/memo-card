
import { RatingScore, WordMemoryState, UserConfig, WordCardData, ReviewLog } from '../types';

/**
 * FSRS (Free Spaced Repetition Scheduler) v4.5 Implementation
 * 
 * Core Parameters (W weights):
 * Trained on benchmark datasets for optimal memory modeling.
 */
const w = [
  0.40255, 1.18385, 3.173, 15.69105, // w0-w3: Initial Stability for Grade 1-4
  7.19605, 0.5345, 1.4604, 0.0046,   // w4-w7: Difficulty Update
  1.54575, 0.1192, 1.01925,          // w8-w10: Stability Update (Success)
  1.9395, 0.11, 0.29605, 1.25985,    // w11-w14: Stability Update (Fail)
  0.0, 1.0, 1.0                      // Reserved
];

// Constants
const RETENTION_FACTOR = 19 / 1; 

/**
 * Helper: Map App Rating (1-5) to FSRS Grade (1-4)
 */
const mapRatingToGrade = (score: RatingScore): number => {
  switch (score) {
    case RatingScore.FAIL: return 1;
    case RatingScore.HARD: return 2;
    case RatingScore.GOOD: return 3;
    case RatingScore.CLEAR: return 4;
    case RatingScore.EASY: return 4;
    default: return 3;
  }
};

/**
 * Calculate Retrievability (R)
 */
export const calculateRetention = (state: WordMemoryState, now: number): number => {
  if (state.reps === 0 || state.strength === 0) return 0; // New card
  
  const elapsedDays = Math.max(0, (now - state.lastReviewDate) / (24 * 60 * 60 * 1000));
  const stability = state.strength;
  
  return Math.pow(1 + RETENTION_FACTOR * elapsedDays / stability, -1);
};

/**
 * Calculate Next Interval based on Target Retention
 */
const calculateNextInterval = (stability: number, targetRetention: number): number => {
  return (stability / RETENTION_FACTOR) * (Math.pow(targetRetention, -1) - 1);
};

/**
 * Update Difficulty (D)
 */
const nextDifficulty = (d: number, grade: number): number => {
  const nextD = d - w[6] * (grade - 3);
  const newD = w[7] * (w[4] - w[5] * (3 - 3)) + (1 - w[7]) * nextD; // Mean reversion
  return Math.min(Math.max(1, newD), 10);
};

/**
 * Update Stability (S) - Recall
 */
const nextStabilityRecall = (d: number, s: number, r: number, grade: number): number => {
  const hardPenalty = grade === 2 ? w[15] : 1;
  const easyBonus = grade === 4 ? w[16] : 1;
  
  return s * (1 + Math.exp(w[8]) * 
    (11 - d) * 
    Math.pow(s, -w[9]) * 
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty * 
    easyBonus
  );
};

/**
 * Update Stability (S) - Forget
 */
const nextStabilityForget = (d: number, s: number, r: number): number => {
  return w[11] * 
    Math.pow(d, -w[12]) * 
    (Math.pow(s + 1, w[13]) - 1) * 
    Math.exp(w[14] * (1 - r));
};

/**
 * Internal simulation for predicting next state without modifying original
 */
const simulateNextState = (currentState: WordMemoryState, grade: number, now: number): WordMemoryState => {
   const newState = { ...currentState };
   
   if (currentState.reps === 0) {
      newState.difficulty = Math.min(Math.max(1, w[4] - (grade - 3) * w[5]), 10);
      newState.strength = w[grade - 1];
      newState.reps = 1;
   } else {
      const r = calculateRetention(currentState, now);
      if (grade === 1) {
         const nextD = nextDifficulty(currentState.difficulty, grade);
         const nextS = nextStabilityForget(currentState.difficulty, currentState.strength, r);
         newState.difficulty = nextD;
         newState.strength = Math.max(0.1, nextS);
         newState.reps += 1;
      } else {
         const nextD = nextDifficulty(currentState.difficulty, grade);
         const nextS = nextStabilityRecall(currentState.difficulty, currentState.strength, r, grade);
         newState.difficulty = nextD;
         newState.strength = nextS;
         newState.reps += 1;
      }
   }
   return newState;
}

/**
 * Public: Preview Next Intervals for UI
 * Returns human-readable strings or days for the buttons (Again, Hard, Good, Easy)
 */
export const previewNextIntervals = (currentState: WordMemoryState, config: UserConfig): Record<string, string> => {
    const now = Date.now();
    const result: Record<string, string> = {};

    // Map our UI ratings to FSRS grades
    const scenarios = [
        { key: 'forgot', grade: 1 },
        { key: 'hard', grade: 2 },
        { key: 'good', grade: 3 },
        { key: 'easy', grade: 4 }
    ];

    scenarios.forEach(({ key, grade }) => {
        const simulatedState = simulateNextState(currentState, grade, now);
        let days = calculateNextInterval(simulatedState.strength, config.targetRetention);
        
        // Formatting
        if (days < 0.04) { // < 1 hour
           result[key] = '< 1h'; 
        } else if (days < 1) {
           result[key] = `${Math.round(days * 24)}h`;
        } else if (days < 30) {
           result[key] = `${Math.round(days)}d`;
        } else if (days < 365) {
           result[key] = `${(days / 30).toFixed(1)}m`;
        } else {
           result[key] = `${(days / 365).toFixed(1)}y`;
        }
    });

    return result;
};

/**
 * Core Update Function
 */
export const updateWordMemory = (
  currentState: WordMemoryState,
  score: RatingScore,
  duration: number,
  config: UserConfig
): WordMemoryState => {
  const now = Date.now();
  const grade = mapRatingToGrade(score);
  const newState = { ...currentState };
  
  // Update History Log
  const newLog: ReviewLog = {
    score,
    reviewTime: now,
    duration,
    strengthBefore: currentState.strength
  };
  newState.history = [newLog, ...currentState.history.slice(0, 9)];
  newState.lastReviewDate = now;

  // === FSRS Logic ===
  if (currentState.reps === 0) {
    newState.difficulty = Math.min(Math.max(1, w[4] - (grade - 3) * w[5]), 10);
    newState.strength = w[grade - 1]; // Stability
    newState.reps = 1;
    if (grade === 1) {
        newState.lapses = 1;
        newState.consecutiveCorrect = 0;
    } else {
        newState.consecutiveCorrect = 1;
    }
  } else {
    const r = calculateRetention(currentState, now);
    if (grade === 1) {
      newState.reps += 1;
      newState.lapses += 1;
      newState.consecutiveCorrect = 0;
      newState.difficulty = nextDifficulty(currentState.difficulty, grade);
      newState.strength = Math.max(0.1, nextStabilityForget(currentState.difficulty, currentState.strength, r));
    } else {
      newState.reps += 1;
      newState.consecutiveCorrect += 1;
      newState.difficulty = nextDifficulty(currentState.difficulty, grade);
      newState.strength = nextStabilityRecall(currentState.difficulty, currentState.strength, r, grade);
    }
  }

  // Calculate Interval
  let intervalDays = calculateNextInterval(newState.strength, config.targetRetention);
  intervalDays = Math.min(Math.max(0, intervalDays), 36500);
  
  // Fuzzing
  if (intervalDays > 2.5) {
      const fuzz = 0.95 + Math.random() * 0.1;
      intervalDays *= fuzz;
  }

  newState.nextReviewDate = now + intervalDays * 24 * 60 * 60 * 1000;
  return newState;
};

/**
 * Priority Calculation for Sorting
 */
export const getReviewPriority = (word: WordCardData, now: number): number => {
  const r = calculateRetention(word.memory, now);
  return 1 - r;
};

/**
 * Adaptive Load
 */
export const calculateAdaptiveLoad = (words: WordCardData[], currentConfig: UserConfig): number => {
  const now = Date.now();
  const dueCount = words.filter(w => w.memory.nextReviewDate <= now).length;
  return Math.max(currentConfig.sessionSize, Math.min(dueCount, currentConfig.maxDailyReview));
};
