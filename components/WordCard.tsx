
import React, { useState } from 'react';
import { WordCardData, WordStatus, SentenceHighlight, HighlightType } from '../types';
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

  const renderSentenceWithHighlights = (text: string, highlights?: SentenceHighlight[]) => {
    if (!highlights || highlights.length === 0) {
      return <span className="text-gray-800 text-sm font-medium leading-relaxed">{text}</span>;
    }

    interface Segment {
      start: number;
      end: number;
      type: HighlightType;
      label: string;
      isGap?: boolean;
    }

    let segments: Segment[] = [];

    highlights.forEach(h => {
      const parts = h.text.split('...').map(p => p.trim()).filter(p => p.length > 0);
      const label = h.type === 'idiom' ? '习语' : h.type === 'slang' ? '俚语' : '搭配';

      if (parts.length === 1) {
        const escaped = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          segments.push({ start: match.index, end: match.index + match[0].length, type: h.type, label });
        }
      } else {
        const searchParts = (startIndex: number): { start: number, end: number, isGap: boolean }[] | null => {
          let currentIdx = startIndex;
          const foundParts: { start: number, end: number, isGap: boolean }[] = [];
          
          for (let i = 0; i < parts.length; i++) {
            const escaped = parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
            regex.lastIndex = currentIdx;
            const match = regex.exec(text);
            if (!match) return null;
            
            if (i > 0) {
              const prevPart = foundParts[foundParts.length - 1];
              foundParts.push({ start: prevPart.end, end: match.index, isGap: true });
            }
            
            foundParts.push({ start: match.index, end: match.index + match[0].length, isGap: false });
            currentIdx = match.index + match[0].length;
          }
          return foundParts;
        };

        let startPos = 0;
        let result;
        while ((result = searchParts(startPos)) !== null) {
          result.forEach(p => segments.push({ ...p, type: h.type, label }));
          startPos = result[result.length - 1].end;
        }
      }
    });

    // Sort by start position
    segments.sort((a, b) => a.start - b.start);

    const finalElements: React.ReactNode[] = [];
    let lastIndex = 0;

    segments.forEach((seg, i) => {
      // Add regular text before this segment
      if (seg.start > lastIndex) {
        finalElements.push(<span key={`text-${i}`}>{text.substring(lastIndex, seg.start)}</span>);
      }
      
      // Ensure we don't overlap or go backwards
      if (seg.start < lastIndex) return;

      let borderColor = "border-primary-400";
      if (seg.type === 'idiom') borderColor = "border-amber-400";
      if (seg.type === 'slang') borderColor = "border-pink-400";

      const borderStyle = seg.isGap ? "border-dashed" : "border-solid";

      finalElements.push(
        <span 
          key={`seg-${i}`} 
          className={`inline border-b-2 ${borderColor} ${borderStyle} relative group transition-all text-gray-800`}
        >
          {text.substring(seg.start, seg.end)}
          {!seg.isGap && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-20 shadow-lg border-none">
              {seg.label}
            </span>
          )}
        </span>
      );

      lastIndex = seg.end;
    });

    if (lastIndex < text.length) {
      finalElements.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return (
      <span className="text-gray-800 text-sm font-medium leading-relaxed whitespace-pre-wrap">
        {finalElements}
      </span>
    );
  };

  const details = data.details;
  if (!details) return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">AI 正在编撰词卡详情...</p>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col min-h-[550px] overflow-hidden animate-flip-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 to-white p-6 border-b border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-4xl font-bold text-gray-800 tracking-tight">{data.word}</h2>
                <div className="flex flex-col items-end gap-1.5">
                   <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-widest">Lv.{data.level}</span>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data.status === WordStatus.NEW ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {data.status === WordStatus.NEW ? '新发现' : '记忆中'}
                   </span>
                </div>
            </div>
            
            <div className="flex gap-3">
                <button onClick={() => playAudio(data.word, 'US')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-600 hover:text-primary-600 hover:border-primary-200 transition-all active:scale-95">
                  <Volume2 size={14} className="text-primary-500"/> 
                  <span>美 /{details.ipa.us}/</span>
                </button>
                <button onClick={() => playAudio(data.word, 'UK')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-gray-600 hover:text-purple-600 hover:border-purple-200 transition-all active:scale-95">
                  <Volume2 size={14} className="text-purple-500"/> 
                  <span>英 /{details.ipa.uk}/</span>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-grow p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Definitions */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                   <div className="p-1 bg-primary-100 text-primary-600 rounded">
                      <Book size={14} />
                   </div>
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">核心释义</h3>
                </div>
                <div className="space-y-4">
                    {details.definitions.map((def, idx) => (
                        <div key={idx} className="relative pl-4 border-l-2 border-primary-100">
                             <div className="flex items-baseline gap-2">
                                <span className="text-[10px] font-black text-primary-400 italic uppercase">{def.pos}</span>
                                <span className="text-sm text-gray-800">{def.meaning}</span>
                             </div>
                             <p className="text-xs text-gray-500 mt-0.5">{def.translation}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Example Sentences */}
            <section className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                       <div className="p-1 bg-amber-100 text-amber-600 rounded">
                          <BookOpen size={14} />
                       </div>
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">地道例句</h3>
                    </div>
                </div>
                <ul className="space-y-5">
                    {details.sentences.map((sent, idx) => (
                        <li key={idx} className="group">
                            <div className="flex flex-col">
                                {renderSentenceWithHighlights(sent.en, sent.highlights)}
                                <p className="text-gray-500 text-xs mt-2 italic font-medium">{sent.cn}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                {/* Legend for highlights */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-primary-400"></span> 常用搭配
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-amber-400"></span> 习语/惯用
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-pink-400"></span> 俚语/非正式
                    </div>
                    <div className="flex items-center gap-1.5 italic">
                        <span className="w-2.5 h-0.5 border-t border-dashed border-gray-400"></span> 结构连接
                    </div>
                </div>
            </section>
            
            <div className="grid grid-cols-2 gap-4">
                {details.collocations && details.collocations.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                           <Zap size={12} className="text-yellow-500"/> 搭配扩展
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {details.collocations.map((col, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded text-[10px] font-medium">
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {details.etymology && (
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                           <Clock size={12} className="text-orange-400"/> 词源故事
                        </h3>
                        <p className="text-[10px] text-gray-500 leading-relaxed bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
                            {details.etymology}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-gray-100 bg-slate-50/50">
            <div className="grid grid-cols-4 gap-3">
                 <button onClick={() => onRate('forgot')} className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all active:scale-95 group">
                   <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform"/>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">完全不认识</span>
                 </button>
                 <button onClick={() => onRate('hard')} className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-all active:scale-95">
                   <span className="text-xl">😬</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">模棱两可</span>
                 </button>
                 <button onClick={() => onRate('good')} className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-all active:scale-95">
                   <span className="text-xl">🙂</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">有点印象</span>
                 </button>
                 <button onClick={() => onRate('easy')} className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-white border border-gray-200 hover:border-green-200 hover:bg-green-50 text-gray-400 hover:text-green-500 transition-all active:scale-95">
                   <span className="text-xl">🤩</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">信手拈来</span>
                 </button>
            </div>
        </div>
    </div>
  );
};

export default WordCard;
