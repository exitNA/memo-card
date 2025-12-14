import React, { useState } from 'react';
import { WordCardData, WordStatus } from '../types';
import { generatePronunciation } from '../services/geminiService';
import { Volume2, BookOpen, Clock, Zap, Book, RotateCcw } from 'lucide-react';

interface WordCardProps {
  data: WordCardData;
  onRate: (rating: 'easy' | 'good' | 'hard' | 'forgot') => void;
}

const WordCard: React.FC<WordCardProps> = ({ data, onRate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const playAudio = async (text: string, type: 'US' | 'UK') => {
    if (loadingAudio || isPlaying) return;
    setLoadingAudio(true);
    try {
      const promptText = type === 'UK' ? `Say the word ${text} with a British accent.` : text;
      const voice = type === 'UK' ? 'Fenrir' : 'Kore'; 
      
      const base64 = await generatePronunciation(promptText, voice);
      
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      await audio.play();
    } catch (e) {
      console.error("Audio playback failed", e);
      setIsPlaying(false);
    } finally {
      setLoadingAudio(false);
    }
  };

  const details = data.details;

  if (!details) {
    return (
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-gray-500 animate-pulse">
        AI 正在生成卡片详情...
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col min-h-[500px] overflow-hidden">
        
        {/* Header Section: Word & Pronunciation */}
        <div className="bg-gradient-to-b from-slate-50 to-white p-6 border-b border-gray-100 pb-4">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-4xl font-bold text-gray-800 tracking-tight">{data.word}</h2>
                <div className="flex flex-col items-end gap-1">
                   <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-wider">Level {data.level}</span>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data.status === WordStatus.NEW ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {data.status === WordStatus.NEW ? '新词' : '复习'}
                   </span>
                </div>
            </div>
            
            <div className="flex gap-3 mt-1">
                <button 
                  onClick={() => playAudio(data.word, 'US')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  <Volume2 size={14} className="text-blue-500"/> 
                  <span>美 {details.ipa.us}</span>
                </button>
                <button 
                  onClick={() => playAudio(data.word, 'UK')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-600 hover:text-purple-600 hover:border-purple-200 transition-colors"
                >
                  <Volume2 size={14} className="text-purple-500"/> 
                  <span>英 {details.ipa.uk}</span>
                </button>
            </div>
        </div>

        {/* Content Section: Scrollable */}
        <div className="flex-grow p-6 pt-4 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Definitions - REFACTORED */}
            <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Book size={14} /> 释义
                </h3>
                <div className="space-y-4">
                    {details.definitions.map((def, idx) => (
                        <div key={idx} className="group">
                             <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 italic border border-blue-100 leading-none">
                                    {def.pos}
                                </span>
                                <span className="text-sm font-semibold text-gray-800 leading-snug">
                                    {def.meaning}
                                </span>
                             </div>
                             <div className="mt-1 pl-1 text-xs text-gray-500 font-medium">
                                {def.translation}
                             </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sentences */}
            <section className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen size={14} /> 例句
                </h3>
                <ul className="space-y-4">
                    {details.sentences.map((sent, idx) => (
                        <li key={idx}>
                            <p className="text-gray-800 text-sm font-medium leading-relaxed mb-1">"{sent.en}"</p>
                            <p className="text-gray-500 text-xs">{sent.cn}</p>
                        </li>
                    ))}
                </ul>
            </section>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {/* Collocations */}
                {details.collocations && details.collocations.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Zap size={14} /> 常用搭配
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {details.collocations.map((col, idx) => (
                                <span key={idx} className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded text-xs">
                                    {col}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Etymology */}
                {details.etymology && (
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Clock size={14} /> 词源
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100">
                            {details.etymology}
                        </p>
                    </section>
                )}
            </div>
        </div>

        {/* Footer: Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-4 gap-2">
                 <button onClick={() => onRate('forgot')} className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95">
                   <RotateCcw size={18} className="text-gray-400 group-hover:text-red-500 mb-1" />
                   <span className="text-xs font-bold text-gray-600 group-hover:text-red-600">忘记</span>
                 </button>
                 <button onClick={() => onRate('hard')} className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50 transition-all active:scale-95">
                   <span className="text-lg mb-1 grayscale group-hover:grayscale-0">😬</span>
                   <span className="text-xs font-bold text-gray-600 group-hover:text-orange-600">模糊</span>
                 </button>
                 <button onClick={() => onRate('good')} className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95">
                   <span className="text-lg mb-1 grayscale group-hover:grayscale-0">🙂</span>
                   <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600">记得</span>
                 </button>
                 <button onClick={() => onRate('easy')} className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all active:scale-95">
                   <span className="text-lg mb-1 grayscale group-hover:grayscale-0">🤩</span>
                   <span className="text-xs font-bold text-gray-600 group-hover:text-green-600">简单</span>
                 </button>
            </div>
        </div>
    </div>
  );
};

export default WordCard;