
import React, { useState, useEffect } from 'react';
import { 
  getWords, saveWords, getDueWords, checkIn, saveStats 
} from './services/storageService';
import { generateWordDetails } from './services/geminiService';
import { WordCardData, WordStatus, AppView, UserStats } from './types';
import { EBBINGHAUS_INTERVALS_DAYS } from './constants';

import Dashboard from './components/Dashboard';
import WordCard from './components/WordCard';
import { X, Search, Loader2, ArrowLeft, Trash2, CheckCircle } from 'lucide-react';

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
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const practiceSet = shuffled.slice(0, 15);
    
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
            newLevel = Math.max(0, currentCard.level - 1);
            nextDate = Date.now(); 
            newStatus = WordStatus.LEARNING;
        }
    } else {
        switch (rating) {
            case 'easy': newLevel = Math.min(currentCard.level + 2, 7); break;
            case 'good': newLevel = Math.min(currentCard.level + 1, 7); break;
            case 'hard': newLevel = Math.max(currentCard.level, 0); break;
            case 'forgot': newLevel = 0; break;
        }
        newStatus = newLevel >= 7 ? WordStatus.MASTERED : WordStatus.LEARNING;
        const daysToAdd = EBBINGHAUS_INTERVALS_DAYS[Math.min(newLevel, 6)];
        nextDate = Date.now() + (daysToAdd * 24 * 60 * 60 * 1000);
    }

    const updatedStats = { ...stats };
    updatedStats.wordsToday += 1;
    
    const today = new Date().toISOString().split('T')[0];
    if (!updatedStats.history) updatedStats.history = [];
    const todayIndex = updatedStats.history.findIndex(h => h.date === today);
    if (todayIndex >= 0) {
        updatedStats.history[todayIndex].count = updatedStats.wordsToday;
    } else {
        updatedStats.history.push({ date: today, count: updatedStats.wordsToday });
    }

    setStats(updatedStats);
    saveStats(updatedStats);

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
    saveWords(updatedWords);

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
      alert(`生成失败: ${e.message}\n请检查 API Key 配置。`);
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

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center space-y-4">
                  <Loader2 className="animate-spin text-primary-500 mx-auto" size={48} />
                  <p className="text-gray-400 font-medium">正在加载您的单词库...</p>
              </div>
          </div>
      );
  }

  const renderAddWord = () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl mt-10 border border-gray-100 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">添加新单词</h2>
        <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={20} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Word to remember</label>
            <div className="relative">
                <input 
                    type="text" 
                    autoFocus
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-transparent outline-none transition-all"
                    placeholder="例如: serendipity"
                    disabled={isAdding}
                />
                <div className="absolute right-3 top-3.5 text-gray-300">
                    {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </div>
            </div>
        </div>
        <button 
            onClick={handleAddWord}
            disabled={isAdding || !newWordInput}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
            {isAdding ? '正在调用 Gemini AI...' : '生成智能记忆卡'}
        </button>
      </div>
    </div>
  );

  const renderSessionCompleted = () => (
    <div className="max-w-md mx-auto p-12 text-center mt-10 bg-white rounded-3xl shadow-xl border border-gray-50 animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
            {isPracticeMode 
                ? '自主练习已圆满结束，这让你的记忆更加牢固。' 
                : `今日复习任务全部达成！你已经巩固了 ${sessionQueue.length} 个单词。`}
        </p>
        <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg"
        >
            返回仪表盘
        </button>
    </div>
  );

  const renderReview = () => {
    if (sessionCompleted) return renderSessionCompleted();
    
    const currentCard = sessionQueue[currentCardIndex];
    const progress = ((currentCardIndex) / sessionQueue.length) * 100;

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col h-screen sm:h-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1 mx-6">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        <span>{isPracticeMode ? 'Practice Mode' : 'Ebbinghaus Cycle'}</span>
                        <span>{currentCardIndex + 1} / {sessionQueue.length}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ease-out ${isPracticeMode ? 'bg-purple-500' : 'bg-primary-500'}`}
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
      <div className="max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView(AppView.DASHBOARD)} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-gray-800">我的生词本 <span className="text-primary-500 text-sm font-medium">({words.length})</span></h2>
          </div>
          
          <div className="grid gap-4">
              {words.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-400">目前还没有添加任何单词。</p>
                      <button onClick={() => setView(AppView.ADD_WORD)} className="mt-4 text-primary-600 font-bold hover:underline">去添加第一个单词 &rarr;</button>
                  </div>
              ) : (
                  words.map(word => (
                      <div key={word.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-all hover:-translate-y-0.5">
                          <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-3 mb-1.5">
                                  <h3 className="font-bold text-lg text-gray-800">{word.word}</h3>
                                  {word.details?.ipa && (
                                    <span className="text-[10px] text-gray-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                      /{word.details.ipa.us}/
                                    </span>
                                  )}
                              </div>
                              
                              {word.details?.definitions && word.details.definitions.length > 0 && (
                                <div className="mb-3">
                                   <p className="text-xs text-gray-600 truncate">
                                     <span className="text-[10px] font-black text-primary-500 uppercase bg-primary-50 px-1.5 py-0.5 rounded-md mr-2 italic">
                                        {word.details.definitions[0].pos}
                                     </span>
                                     {word.details.definitions[0].meaning}
                                   </p>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-3 text-[10px] items-center text-gray-400">
                                  <span className="bg-gray-50 text-gray-500 font-bold px-2 py-0.5 rounded border border-gray-100">Lv.{word.level}</span>
                                  <span className={`px-2 py-0.5 rounded font-bold ${word.status === WordStatus.MASTERED ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                      {word.status}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    下次复习: {new Date(word.nextReviewDate).toLocaleDateString()}
                                  </span>
                              </div>
                          </div>
                          <button onClick={() => handleDeleteWord(word.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans selection:bg-primary-100">
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
