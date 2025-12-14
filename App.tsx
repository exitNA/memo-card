import React, { useState, useEffect } from 'react';
import { 
  getWords, saveWords, getDueWords, checkIn, saveStats 
} from './services/storageService';
import { generateWordDetails } from './services/geminiService';
import { WordCardData, WordStatus, AppView, UserStats } from './types';
import { INTERVALS_MS, EBBINGHAUS_INTERVALS_DAYS } from './constants';

import Dashboard from './components/Dashboard';
import WordCard from './components/WordCard';
import { X, Search, Loader2, ArrowLeft, Trash2, CheckCircle, WifiOff } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [words, setWords] = useState<WordCardData[]>([]);
  const [stats, setStats] = useState<UserStats>({ streak: 0, lastLoginDate: '', totalWordsLearned: 0, wordsToday: 0, history: [] });
  const [sessionQueue, setSessionQueue] = useState<WordCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [newWordInput, setNewWordInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
        try {
            const loadedWords = await getWords();
            setWords(loadedWords);
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

  const handleStartReview = () => {
    const due = getDueWords(words);
    if (due.length === 0) return;
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
    // Shuffle and pick top 20 for practice
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const practiceSet = shuffled.slice(0, 20);
    
    setSessionQueue(practiceSet);
    setCurrentCardIndex(0);
    setSessionCompleted(false);
    setIsPracticeMode(true);
    setView(AppView.REVIEW);
  };

  const handleRate = (rating: 'easy' | 'good' | 'hard' | 'forgot') => {
    const currentCard = sessionQueue[currentCardIndex];
    let newLevel = currentCard.level;
    let nextDate = currentCard.nextReviewDate;
    let newStatus = currentCard.status;

    if (isPracticeMode) {
        if (rating === 'forgot') {
            newLevel = 1;
            nextDate = Date.now(); 
            newStatus = WordStatus.LEARNING;
        }
    } else {
        switch (rating) {
            case 'easy': newLevel = Math.min(currentCard.level + 2, 7); break;
            case 'good': newLevel = Math.min(currentCard.level + 1, 7); break;
            case 'hard': newLevel = Math.max(currentCard.level, 0); break;
            case 'forgot': newLevel = 1; break;
        }
        newStatus = newLevel >= 7 ? WordStatus.MASTERED : WordStatus.LEARNING;
        const daysToAdd = EBBINGHAUS_INTERVALS_DAYS[Math.min(newLevel, 6)];
        nextDate = Date.now() + (daysToAdd * 24 * 60 * 60 * 1000);
    }

    // --- UPDATE STATS ---
    const updatedStats = { ...stats };
    updatedStats.wordsToday += 1;
    
    const today = new Date().toISOString().split('T')[0];
    if (!updatedStats.history) updatedStats.history = [];
    const todayIndex = updatedStats.history.findIndex(h => h.date === today);
    if (todayIndex >= 0) {
        updatedStats.history[todayIndex].count = updatedStats.wordsToday;
    } else {
        updatedStats.history.push({ date: today, count: 1 });
    }

    setStats(updatedStats);
    saveStats(updatedStats);

    // --- UPDATE WORD ---
    const updatedWords = words.map(w => {
      if (w.id === currentCard.id) {
        return {
          ...w,
          level: newLevel,
          status: newStatus,
          lastReviewDate: Date.now(), 
          nextReviewDate: nextDate,
          reviewCount: w.reviewCount + 1
        };
      }
      return w;
    });

    setWords(updatedWords);
    saveWords(updatedWords); // Syncs to backend in background

    // --- NEXT CARD ---
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
        level: 0, 
        nextReviewDate: Date.now(),
        lastReviewDate: 0,
        status: WordStatus.NEW,
        reviewCount: 0
      };
      
      const updatedWords = [...words, newWord];
      setWords(updatedWords);
      saveWords(updatedWords);
      setNewWordInput('');
      setView(AppView.DASHBOARD); 
    } catch (e: any) {
      console.error(e);
      alert(`生成失败: ${e.message || "请检查后端服务是否运行"}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteWord = (id: string) => {
      if(window.confirm('确定要删除这个单词吗？')) {
          const updated = words.filter(w => w.id !== id);
          setWords(updated);
          saveWords(updated);
      }
  }

  // --- RENDER HELPERS ---

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-primary-500" size={48} />
          </div>
      );
  }

  const renderAddWord = () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">添加新单词</h2>
        <button onClick={() => setView(AppView.DASHBOARD)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输入想要记忆的单词</label>
            <div className="relative">
                <input 
                    type="text" 
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="例如: serendipity"
                    disabled={isAdding}
                />
                <div className="absolute right-3 top-3 text-gray-400">
                    {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </div>
            </div>
        </div>
        <button 
            onClick={handleAddWord}
            disabled={isAdding || !newWordInput}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
            {isAdding ? '正在请求后端 AI...' : '生成记忆卡片'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
            需要 Python 后端运行以支持 AI 生成。
        </p>
      </div>
    </div>
  );

  const renderSessionCompleted = () => (
    <div className="max-w-md mx-auto p-8 text-center mt-10">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">本次练习完成！</h2>
        <p className="text-gray-600 mb-8">
            {isPracticeMode 
                ? '自主练习有助于加深记忆印记。' 
                : `你今天复习了 ${sessionQueue.length} 个单词，保持状态！`}
        </p>
        <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
        >
            返回主页
        </button>
    </div>
  );

  const renderReview = () => {
    if (sessionCompleted) return renderSessionCompleted();
    
    const currentCard = sessionQueue[currentCardIndex];
    const progress = ((currentCardIndex) / sessionQueue.length) * 100;

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col h-screen sm:h-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1 mx-4">
                     <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{isPracticeMode ? '自主练习模式' : '每日复习模式'}</span>
                        <span>{currentCardIndex + 1} / {sessionQueue.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ease-out ${isPracticeMode ? 'bg-purple-500' : 'bg-primary-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <WordCard 
                data={currentCard}
                onRate={handleRate}
            />
        </div>
    );
  };

  const renderWordList = () => (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold">我的生词本 ({words.length})</h2>
          </div>
          
          <div className="grid gap-3">
              {words.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">还没有添加单词。</div>
              ) : (
                  words.map(word => (
                      <div key={word.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
                          <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-baseline gap-2 mb-1">
                                  <h3 className="font-bold text-lg text-gray-800">{word.word}</h3>
                                  {word.details?.ipa && (
                                    <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                                      /{word.details.ipa.us}/
                                    </span>
                                  )}
                              </div>
                              
                              {word.details?.definitions && word.details.definitions.length > 0 && (
                                <div className="mb-2">
                                   <p className="text-sm text-gray-700 truncate">
                                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded mr-2 italic">
                                        {word.details.definitions[0].pos}
                                     </span>
                                     {word.details.definitions[0].meaning}
                                   </p>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 text-xs items-center text-gray-500">
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">Level {word.level}</span>
                                  <span className={`px-2 py-0.5 rounded font-medium ${word.status === WordStatus.MASTERED ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {word.status}
                                  </span>
                                  <span className="ml-auto sm:ml-0 border-l pl-2 border-gray-200">
                                    下次: {new Date(word.nextReviewDate).toLocaleDateString()}
                                  </span>
                              </div>
                          </div>
                          <button onClick={() => handleDeleteWord(word.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
      {view === AppView.DASHBOARD && (
        <Dashboard 
          stats={stats}
          words={words}
          dueCount={getDueWords(words).length}
          onStartReview={handleStartReview}
          onStartPractice={handleStartPractice}
          onAddWord={() => setView(AppView.ADD_WORD)}
          onViewList={() => setView(AppView.WORD_LIST)}
        />
      )}
      {view === AppView.ADD_WORD && renderAddWord()}
      {view === AppView.REVIEW && renderReview()}
      {view === AppView.WORD_LIST && renderWordList()}
    </div>
  );
};

export default App;