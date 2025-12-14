import React, { useState } from 'react';
import { UserStats, WordCardData, WordStatus } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { Trophy, Flame, PlusCircle, PlayCircle, BrainCircuit, Activity, Dumbbell, X } from 'lucide-react';
import CalendarWidget from './CalendarWidget';

interface DashboardProps {
  stats: UserStats;
  words: WordCardData[];
  dueCount: number;
  onStartReview: () => void;
  onStartPractice: () => void;
  onAddWord: () => void;
  onViewList: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, words, dueCount, onStartReview, onStartPractice, onAddWord, onViewList }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Calculate level distribution for the chart
  const levelDistribution = Array(8).fill(0);
  words.forEach(w => {
    levelDistribution[w.level] = (levelDistribution[w.level] || 0) + 1;
  });
  
  const barChartData = levelDistribution.map((count, level) => ({
    name: level === 7 ? 'Master' : `L${level}`,
    count,
    color: level === 7 ? '#10b981' : '#3b82f6'
  }));

  // Prepare History Data for AreaChart
  const historyData = stats.history && stats.history.length > 0 
    ? stats.history.map(h => ({
        date: h.date.slice(5), // Show MM-DD
        count: h.count
      }))
    : [{ date: 'Today', count: stats.wordsToday }];

  const masteredCount = words.filter(w => w.status === WordStatus.MASTERED).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 relative">
      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative overflow-hidden">
                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={() => setShowCalendar(false)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <CalendarWidget history={stats.history} />
             </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center mb-2">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <BrainCircuit className="text-primary-500" /> MemoCurve
           </h1>
           <p className="text-sm text-gray-500">每日艾宾浩斯记忆打卡</p>
        </div>
        <div className="flex items-center gap-4">
           {/* Clickable Streak Section */}
           <div 
             className="flex flex-col items-end cursor-pointer group hover:opacity-80 transition-all"
             onClick={() => setShowCalendar(true)}
             title="点击查看打卡日历"
           >
             <div className="flex items-center gap-1 text-orange-500 font-bold group-hover:scale-105 transition-transform">
               <Flame size={20} fill="currentColor" />
               <span>{stats.streak} 天连续打卡</span>
             </div>
             <div className="text-xs text-gray-400 group-hover:text-primary-500">
               今日已复习 {stats.wordsToday} 个单词
             </div>
           </div>
        </div>
      </header>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Review Card - Prioritized */}
        <div 
          onClick={dueCount > 0 ? onStartReview : undefined}
          className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 shadow-lg group md:col-span-2 ${
            dueCount > 0 
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white cursor-pointer hover:shadow-xl hover:scale-[1.01]' 
              : 'bg-gray-100 text-gray-400 cursor-default'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PlayCircle size={120} />
          </div>
          <h2 className="text-2xl font-bold mb-2">开始复习</h2>
          <p className={`text-sm mb-8 max-w-[80%] ${dueCount > 0 ? 'text-primary-100' : 'text-gray-400'}`}>
            {dueCount > 0 ? '根据艾宾浩斯遗忘曲线，现在是巩固记忆的最佳时刻。' : '今日复习任务已完成，你可以通过自主练习来加强记忆。'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold">{dueCount}</span>
            <span className="mb-2 text-lg font-medium opacity-80">个待复习</span>
          </div>
        </div>

        {/* Secondary Actions Column */}
        <div className="flex flex-col gap-4">
            {/* Practice / Self Study */}
            <div 
                onClick={onStartPractice}
                className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition-all group shadow-sm"
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                        <Dumbbell size={20} />
                    </div>
                </div>
                <h3 className="font-bold text-gray-800">自主练习</h3>
                <p className="text-xs text-gray-400 mt-1">随机抽取 20 个单词进行强化训练，不影响复习进度。</p>
            </div>

            {/* Add Word */}
            <div 
                onClick={onAddWord}
                className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-primary-200 hover:bg-primary-50 transition-all group shadow-sm"
            >
                <div className="flex justify-between items-start mb-2">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <PlusCircle size={20} />
                    </div>
                </div>
                <h3 className="font-bold text-gray-800">添加单词</h3>
                <p className="text-xs text-gray-400 mt-1">AI 智能生成词卡。</p>
            </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
           <span className="text-2xl font-bold text-gray-800">{words.length}</span>
           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">词汇总量</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
           <span className="text-2xl font-bold text-green-600">{masteredCount}</span>
           <span className="text-[10px] uppercase font-bold text-green-600/60 tracking-wider">已掌握</span>
        </div>
        <div 
            className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={onViewList}
        >
           <span className="text-primary-600 font-bold text-lg">查看全部</span>
           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">生词本 &rarr;</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Learning Curve */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} /> 记忆曲线 (复习量)
            </h3>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10, fill: '#94a3b8'}} 
                            axisLine={false} 
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <Tooltip 
                             contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                             labelStyle={{color: '#64748b', fontSize: '12px'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#0ea5e9" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorCount)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Ebbinghaus Distribution */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BrainCircuit size={16} /> 记忆分布 (艾宾浩斯)
            </h3>
            <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;