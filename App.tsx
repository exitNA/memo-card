
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  getWords, saveWords, getDueWordsList, checkIn, saveStats, createInitialMemoryState 
} from './services/storageService';
import { generateWordDetails } from './services/geminiService';
import { updateWordMemory, calculateAdaptiveLoad, previewNextIntervals } from './services/memoryAlgorithm';
import { WordCardData, WordStatus, AppView, UserStats, RatingScore } from './types';

import Dashboard from './components/Dashboard';
import WordCard from './components/WordCard';
import { X, Search, Loader2, ArrowLeft, Trash2, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [words, setWords] = useState<WordCardData[]>([]);
  const [stats, setStats] = useState<UserStats>({ 
    streak: 0, 
    lastLoginDate: '', 
    totalWordsLearned: 0, 
    wordsToday: 0, 
    history: [],
    config: { maxDailyReview: 100, sessionSize: 10, targetRetention: 0.9, difficultyPreference: 1.0 }
  });
  const [sessionQueue, setSessionQueue] = useState<WordCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [newWordInput, setNewWordInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // 用于测量单词复习耗时
  const cardStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const initData = async () => {
        try {
            const loadedWords = await getWords();
            const sanitizedWords = loadedWords.map(w => ({
                ...w,
                level: w.level ?? (w.memory ? Math.min(7, Math.floor(w.memory.strength / 14)) : 0)
            }));
            setWords(sanitizedWords);
            const currentStats = checkIn();
            setStats(currentStats);
        } catch (e) {
            console.error("Initialization failed", e);
        } finally {
            setLoading(false);
        }
    };
    initData();
  }, []);

  useEffect(() => {
    if (view === AppView.REVIEW && !sessionCompleted) {
      cardStartTimeRef.current = Date.now();
    }
  }, [view, currentCardIndex, sessionCompleted]);

  // 计算当前卡片的下一次复习间隔预览
  const currentIntervals = useMemo(() => {
      if (view !== AppView.REVIEW || sessionCompleted || !sessionQueue[currentCardIndex]) return undefined;
      // 练习模式下不显示算法预测，因为不会真正保存
      if (isPracticeMode) return undefined;
      return previewNextIntervals(sessionQueue[currentCardIndex].memory, stats.config);
  }, [view, sessionCompleted, currentCardIndex, sessionQueue, stats.config, isPracticeMode]);

  const handleStartReview = () => {
    // 动态调整负荷
    const adaptiveSize = calculateAdaptiveLoad(words, stats.config);
    const due = getDueWordsList(words, { ...stats.config, maxDailyReview: adaptiveSize });
    
    if (due.length === 0) {
        alert("今日复习任务已全部完成！建议添加新单词。");
        return;
    }
    
    setSessionQueue(due);
    setCurrentCardIndex(0);
    setSessionCompleted(false);
    setIsPracticeMode(false);
    setView(AppView.REVIEW);
  };

  const handleStartPractice = () => {
    if (words.length === 0) {
        alert("请先添加一些单词！");
        return;
    }
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    setSessionQueue(shuffled.slice(0, 15));
    setCurrentCardIndex(0);
    setSessionCompleted(false);
    setIsPracticeMode(true);
    setView(AppView.REVIEW);
  };

  const handleRate = (ratingStr: 'easy' | 'good' | 'hard' | 'forgot') => {
    // 将 UI 按钮映射到 1-5 分
    const ratingMap: Record<string, RatingScore> = {
      'forgot': RatingScore.FAIL, // 1分
      'hard': RatingScore.HARD,   // 2分
      'good': RatingScore.GOOD,   // 3分
      'easy': RatingScore.EASY    // 5分
    };
    
    const score = ratingMap[ratingStr];
    const duration = Date.now() - cardStartTimeRef.current;
    const currentCard = sessionQueue[currentCardIndex];

    // ==========================================
    // 逻辑分支：自主练习模式 (Practice Mode)
    // ==========================================
    if (isPracticeMode) {
        // 练习模式只增加 "今日学习计数"，不污染 FSRS 算法参数
        // 也不增加 history reps，纯粹作为 Quiz
        if (currentCardIndex < sessionQueue.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setSessionCompleted(true);
        }
        return;
    }

    // ==========================================
    // 逻辑分支：正式复习 (Review Mode)
    // ==========================================

    // 1. 调用核心算法更新状态
    const newMemoryState = updateWordMemory(currentCard.memory, score, duration, stats.config);
    
    // 2. 更新全局状态 (Words Array)
    const updatedWords = words.map(w => {
      if (w.id === currentCard.id) {
        return {
          ...w,
          status: newMemoryState.strength > 40 ? WordStatus.MASTERED : WordStatus.LEARNING,
          memory: newMemoryState,
          level: Math.min(7, Math.floor(newMemoryState.strength / 14))
        };
      }
      return w;
    });
    setWords(updatedWords);
    saveWords(updatedWords);

    // 3. 更新统计数据
    const updatedStats = { ...stats };
    updatedStats.wordsToday += 1;
    const today = new Date().toISOString().split('T')[0];
    if (!updatedStats.history) updatedStats.history = [];
    const todayIdx = updatedStats.history.findIndex(h => h.date === today);
    if (todayIdx >= 0) updatedStats.history[todayIdx].count = updatedStats.wordsToday;
    else updatedStats.history.push({ date: today, count: updatedStats.wordsToday });
    setStats(updatedStats);
    saveStats(updatedStats);

    // 4. 队列控制 (Re-queue Logic)
    // 如果用户选了 "Forgot"，我们将这张卡（更新后的状态）重新插入到当前 Session 队列末尾
    // 这样用户在本次 Session 结束前必须再次复习它，增强短期记忆。
    if (score === RatingScore.FAIL) {
        const updatedCardInstance = {
            ...currentCard,
            memory: newMemoryState
        };
        setSessionQueue(prev => [...prev, updatedCardInstance]);
    }

    if (currentCardIndex < sessionQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleAddWord = async () => {
    if (!newWordInput.trim()) return;
    setIsAdding(true);
    try {
      const details = await generateWordDetails(newWordInput.trim());
      const newWord: WordCardData = {
        id: crypto.randomUUID(),
        word: details.spelling, 
        addedAt: Date.now(),
        details: details,
        status: WordStatus.NEW,
        memory: createInitialMemoryState(),
        level: 0
      };
      
      const updatedWords = [...words, newWord];
      setWords(updatedWords);
      saveWords(updatedWords);
      setNewWordInput('');
      setView(AppView.DASHBOARD); 
    } catch (e: any) {
      console.error(e);
      alert(`生成失败: ${e.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteWord = (id: string) => {
      if(window.confirm('确定要从词库中永久删除吗？')) {
          const updated = words.filter(w => w.id !== id);
          setWords(updated);
          saveWords(updated);
      }
  }

  // 渲染视图逻辑保持一致，略...
  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
  );

  const renderAddWord = () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl mt-10 border border-gray-100 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">添加新单词</h2>
        <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <input 
            type="text" autoFocus value={newWordInput}
            onChange={(e) => setNewWordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            className="w-full pl-4 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="输入英文单词..."
            disabled={isAdding}
        />
        <button 
            onClick={handleAddWord} disabled={isAdding || !newWordInput}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all"
        >
            {isAdding ? 'AI 正在分析并编撰...' : '生成智能记忆卡'}
        </button>
      </div>
    </div>
  );

  const renderReview = () => {
    if (sessionCompleted) return (
      <div className="max-w-md mx-auto p-12 text-center mt-10 bg-white rounded-3xl shadow-xl animate-fade-in">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">学习Session完成</h2>
          <p className="text-gray-500 mb-8">抗遗忘引擎已根据您的表现成功调整了记忆通路。</p>
          <button onClick={() => setView(AppView.DASHBOARD)} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold">返回仪表盘</button>
      </div>
    );
    
    const currentCard = sessionQueue[currentCardIndex];
    // Progress calculation needs to account for dynamic queue length (due to re-queuing)
    const progress = (currentCardIndex / sessionQueue.length) * 100;

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col min-h-screen animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-white rounded-full"><ArrowLeft size={20} /></button>
                <div className="flex-1 mx-6">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2">
                        <span>STRENGTH: {currentCard.memory.strength.toFixed(1)}%</span>
                        <span>{currentCardIndex + 1} / {sessionQueue.length} {sessionQueue.length > 15 && '(Re-learning Active)'}</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
            {/* Pass predicted intervals to WordCard */}
            <WordCard data={currentCard} intervals={currentIntervals} onRate={handleRate} />
        </div>
    );
  };

  const renderWordList = () => (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-white rounded-full"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold text-gray-800">词库管理</h2>
          </div>
          <div className="grid gap-4">
              {words.map(word => (
                  <div key={word.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-lg">{word.word}</h3>
                          <div className="flex gap-4 text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                              <span>强度: {word.memory.strength.toFixed(1)}</span>
                              <span>复习: {word.memory.reps}次</span>
                              <span>状态: {word.status}</span>
                          </div>
                      </div>
                      <button onClick={() => handleDeleteWord(word.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {view === AppView.DASHBOARD && (
        <Dashboard 
          stats={stats} words={words} dueCount={getDueWordsList(words, stats.config).length}
          onStartReview={handleStartReview} onStartPractice={handleStartPractice}
          onAddWord={() => setView(AppView.ADD_WORD)} onViewList={() => setView(AppView.WORD_LIST)}
        />
      )}
      {view === AppView.ADD_WORD && renderAddWord()}
      {view === AppView.REVIEW && renderReview()}
      {view === AppView.WORD_LIST && renderWordList()}
    </div>
  );
};

export default App;
