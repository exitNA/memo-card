
import React, { useState } from 'react';
import { WordCardData, WordStatus, SentenceHighlight, HighlightType } from '../types';
import { generatePronunciation } from '../services/geminiService';
import { Volume2, BookOpen, Clock, Zap, Book, RotateCcw, GitMerge } from 'lucide-react';

interface WordCardProps {
  data: WordCardData;
  intervals?: Record<string, string>; // New Prop: Forecasted intervals
  onRate: (rating: 'easy' | 'good' | 'hard' | 'forgot') => void;
}

const WordCard: React.FC<WordCardProps> = ({ data, intervals, onRate }) => {
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

    segments.sort((a, b) => a.start - b.start);

    const finalElements: React.ReactNode[] = [];
    let lastIndex = 0;

    segments.forEach((seg, i) => {
      if (seg.start > lastIndex) {
        finalElements.push(<span key={`text-${i}`}>{text.substring(lastIndex, seg.start)}</span>);
      }
      
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
    <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">AI 正在编撰...</p>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col min-h-[500px] overflow-hidden animate-flip-in">
        {/* Header - 压缩内边距 */}
        <div className="bg-gradient-to-br from-slate-50 to-white px-5 py-3 border-b border-gray-100">
            <div className="flex justify-between items-start">
                <h2 className="text-4xl font-bold text-gray-800 tracking-tight">{data.word}</h2>
                <div className="flex flex-col items-end gap-1">
                   <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px] font-bold uppercase tracking-widest">Lv.{data.level}</span>
                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${data.status === WordStatus.NEW ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                      {data.status === WordStatus.NEW ? '新发现' : '复习中'}
                   </span>
                </div>
            </div>
            
            <div className="flex gap-3 mt-2">
                <button onClick={() => playAudio(data.word, 'US')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-100 shadow-sm text-xs font-semibold text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-all active:scale-95">
                  <Volume2 size={14} className="text-primary-400"/> 
                  <span>美 /{details.ipa.us}/</span>
                </button>
                <button onClick={() => playAudio(data.word, 'UK')} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-100 shadow-sm text-xs font-semibold text-gray-500 hover:text-purple-600 hover:border-purple-200 transition-all active:scale-95">
                  <Volume2 size={14} className="text-purple-400"/> 
                  <span>英 /{details.ipa.uk}/</span>
                </button>
            </div>
        </div>

        {/* Morphological Variations (Inflections) */}
        {details.inflections && Object.values(details.inflections).some(Boolean) && (
            <div className="px-5 pt-3 pb-1 flex flex-wrap gap-2">
                {details.inflections.plural && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">复数</span> {details.inflections.plural}
                    </div>
                )}
                {details.inflections.thirdPersonSingular && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">三单</span> {details.inflections.thirdPersonSingular}
                    </div>
                )}
                {details.inflections.pastTense && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">过去式</span> {details.inflections.pastTense}
                    </div>
                )}
                {details.inflections.pastParticiple && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">过去分词</span> {details.inflections.pastParticiple}
                    </div>
                )}
                 {details.inflections.presentParticiple && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">现在分词</span> {details.inflections.presentParticiple}
                    </div>
                )}
            </div>
        )}

        {/* Content - 减少分段间距 */}
        <div className="flex-grow px-5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
            {/* Definitions */}
            <section>
                <div className="flex items-center gap-1.5 mb-1.5">
                   <div className="p-1 bg-primary-50 text-primary-500 rounded">
                      <Book size={14} />
                   </div>
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">释义</h3>
                </div>
                <div className="space-y-2">
                    {details.definitions.map((def, idx) => (
                        <div key={idx} className="relative pl-3 border-l-2 border-primary-100">
                             <div className="flex items-baseline gap-2">
                                <span className="text-[10px] font-black text-primary-400 italic uppercase">{def.pos}</span>
                                <span className="text-base text-gray-700">{def.meaning}</span>
                             </div>
                             <p className="text-sm text-gray-500 mt-0.5">{def.translation}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Example Sentences */}
            <section className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 relative">
                <div className="flex items-center gap-1.5 mb-2">
                    <div className="p-1 bg-amber-50 text-amber-500 rounded">
                        <BookOpen size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">例句</h3>
                </div>
                <ul className="space-y-3">
                    {details.sentences.map((sent, idx) => (
                        <li key={idx}>
                            <div className="flex flex-col">
                                {renderSentenceWithHighlights(sent.en, sent.highlights)}
                                <p className="text-gray-500 text-xs mt-1 italic">{sent.cn}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold text-gray-400">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 bg-primary-400"></span> 搭配
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 bg-amber-400"></span> 习语
                    </div>
                </div>
            </section>
            
            <div className="grid grid-cols-2 gap-4">
                {details.collocations && details.collocations.length > 0 && (
                    <div className="space-y-1.5">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                           <Zap size={12} className="text-yellow-400"/> 搭配词
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {details.collocations.map((col, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded text-[10px] font-medium">
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {details.etymology && (
                    <div className="space-y-1.5">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                           <Clock size={12} className="text-orange-400"/> 词源
                        </h3>
                        <p className="text-[11px] text-gray-500 leading-normal bg-orange-50/40 p-2 rounded-lg border border-orange-100/50">
                            {details.etymology}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Action Bar - 压缩内边距 */}
        <div className="px-4 py-3 border-t border-gray-100 bg-slate-50/50">
            <div className="grid grid-cols-4 gap-3">
                 <button onClick={() => onRate('forgot')} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all active:scale-95 group relative">
                   {intervals && <span className="absolute -top-3 text-[10px] font-bold text-red-400">{intervals['forgot']}</span>}
                   <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform"/>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">完全不认识</span>
                 </button>
                 <button onClick={() => onRate('hard')} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-orange-200 hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-all active:scale-95 relative">
                   {intervals && <span className="absolute -top-3 text-[10px] font-bold text-orange-400">{intervals['hard']}</span>}
                   <span className="text-xl">😬</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">模棱两可</span>
                 </button>
                 <button onClick={() => onRate('good')} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-all active:scale-95 relative">
                   {intervals && <span className="absolute -top-3 text-[10px] font-bold text-primary-400">{intervals['good']}</span>}
                   <span className="text-xl">🙂</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">有点印象</span>
                 </button>
                 <button onClick={() => onRate('easy')} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-green-200 hover:bg-green-50 text-gray-400 hover:text-green-500 transition-all active:scale-95 relative">
                   {intervals && <span className="absolute -top-3 text-[10px] font-bold text-green-400">{intervals['easy']}</span>}
                   <span className="text-xl">🤩</span>
                   <span className="text-[10px] font-bold uppercase tracking-tighter">信手拈来</span>
                 </button>
            </div>
        </div>
    </div>
  );
};

export default WordCard;
