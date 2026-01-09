
import React, { useState, useMemo } from 'react';
import { UserStats, WordCardData, WordStatus } from '../types';
import { calculateRetention } from '../services/memoryAlgorithm';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, CartesianGrid 
} from 'recharts';
import { 
  Flame, PlusCircle, Timer, BrainCircuit, Activity, Dumbbell, 
  X, Book, GraduationCap, Layers, Zap, Scale, BarChart3, CalendarDays
} from 'lucide-react';
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
  
  // === Data Processing for FSRS Metrics ===
  const { 
    retentionData, 
    forecastData, 
    difficultyData,
    stabilityData,
    heatmapData,
    last30DaysCount,
    avgDifficulty, 
    avgStrength 
  } = useMemo(() => {
    const now = Date.now();
    
    // 1. Retention Distribution (Pie)
    const rGroups = [
      { name: '危急 (<80%)', value: 0, color: '#ef4444', desc: '急需复习' },      
      { name: '最佳区间 (80-90%)', value: 0, color: '#f59e0b', desc: '复习收益最大' }, 
      { name: '稳固 (90-99%)', value: 0, color: '#3b82f6', desc: '记忆安全' },      
      { name: '崭新 (>99%)', value: 0, color: '#10b981', desc: '刚学/极熟' },      
    ];

    let totalDiff = 0;
    let totalStrength = 0;
    let ratedCount = 0;

    // 2. Forecast (Bar)
    const forecast = Array(7).fill(0).map((_, i) => {
        const date = new Date(now + i * 24 * 60 * 60 * 1000);
        return {
            day: i === 0 ? '今天' : i === 1 ? '明天' : date.toLocaleDateString('zh-CN', { weekday: 'short' }),
            count: 0
        };
    });

    // 3. Difficulty Distribution (Bar) - Buckets 1-10
    const difficultyDist = Array(10).fill(0).map((_, i) => ({ level: i + 1, count: 0 }));

    // 4. Stability Maturity (Bar)
    const stabilityDist = [
        { label: '<1d', min: 0, max: 1, count: 0, color: '#94a3b8' },
        { label: '1-7d', min: 1, max: 7, count: 0, color: '#60a5fa' },
        { label: '7-21d', min: 7, max: 21, count: 0, color: '#34d399' },
        { label: '21-90d', min: 21, max: 90, count: 0, color: '#a78bfa' },
        { label: '>90d', min: 90, max: 99999, count: 0, color: '#f472b6' },
    ];

    words.forEach(w => {
      // Calculate basic stats for active cards
      if (w.memory.reps > 0) {
          totalDiff += w.memory.difficulty;
          totalStrength += w.memory.strength;
          ratedCount++;

          // Difficulty bucket
          const dIndex = Math.min(9, Math.max(0, Math.round(w.memory.difficulty) - 1));
          difficultyDist[dIndex].count++;

          // Stability bucket
          const s = w.memory.strength;
          const sBucket = stabilityDist.find(b => s >= b.min && s < b.max);
          if (sBucket) sBucket.count++;
      }

      // Retention logic
      let r = 0;
      if (w.memory.reps === 0) {
        r = 0; 
      } else {
        r = calculateRetention(w.memory, now);
      }

      if (w.memory.reps > 0) {
        if (r < 0.80) rGroups[0].value++;
        else if (r < 0.90) rGroups[1].value++;
        else if (r < 0.99) rGroups[2].value++;
        else rGroups[3].value++;
      } else {
        if (r < 0.80) rGroups[0].value++;
      }

      // Forecast logic
      const diffTime = w.memory.nextReviewDate - now;
      if (diffTime <= 0) {
          forecast[0].count++;
      } else {
          const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
          if (diffDays < 7 && diffDays >= 0) {
              forecast[diffDays].count++;
          }
      }
    });

    // 5. Heatmap Generation (Last 16 weeks)
    const heatmap = [];
    const heatmapWeeks = 16;
    const today = new Date();
    // Start from Sunday of X weeks ago
    const startHeatmap = new Date(today);
    startHeatmap.setDate(today.getDate() - (heatmapWeeks * 7) - today.getDay());
    
    // We iterate until today
    let curr = new Date(startHeatmap);
    while (curr <= today) {
         const dStr = curr.toISOString().split('T')[0];
         const entry = stats.history.find(h => h.date === dStr);
         const count = entry ? entry.count : 0;
         let level = 0;
         if (count > 0) level = 1;
         if (count > 5) level = 2;
         if (count > 15) level = 3;
         if (count > 30) level = 4;
         
         heatmap.push({ date: dStr, count, level });
         curr.setDate(curr.getDate() + 1);
    }
    
    // Last 30 days summary count
    let count30 = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];
    stats.history.forEach(h => {
        if (h.date >= thirtyDaysStr) count30 += h.count;
    });

    return {
      retentionData: rGroups.filter(g => g.value > 0),
      forecastData: forecast,
      difficultyData: difficultyDist,
      stabilityData: stabilityDist,
      heatmapData: heatmap,
      last30DaysCount: count30,
      avgDifficulty: ratedCount ? (totalDiff / ratedCount).toFixed(1) : '0.0',
      avgStrength: ratedCount ? (totalStrength / ratedCount).toFixed(1) : '0.0'
    };
  }, [words, stats.history]);

  const masteredCount = words.filter(w => w.status === WordStatus.MASTERED).length;

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-100 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          <p className="text-primary-600">
            {payload[0].value} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  const getHeatmapColor = (level: number) => {
      switch(level) {
          case 0: return 'bg-slate-100';
          case 1: return 'bg-primary-200';
          case 2: return 'bg-primary-400';
          case 3: return 'bg-primary-600';
          case 4: return 'bg-primary-800';
          default: return 'bg-slate-100';
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 relative pb-20">
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
             <BrainCircuit className="text-primary-500" /> 拾洸帖
           </h1>
           <p className="text-sm text-gray-500">抗遗忘算法 FSRS v4.5 Active</p>
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
        {/* Review Card */}
        <div 
          onClick={dueCount > 0 ? onStartReview : undefined}
          className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 shadow-lg group md:col-span-2 ${
            dueCount > 0 
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white cursor-pointer hover:shadow-xl hover:scale-[1.01]' 
              : 'bg-gray-100 text-gray-400 cursor-default'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Timer size={120} />
          </div>
          <h2 className="text-2xl font-bold mb-2">开始复习</h2>
          <p className={`text-sm mb-8 max-w-[80%] ${dueCount > 0 ? 'text-primary-100' : 'text-gray-400'}`}>
            {dueCount > 0 ? '记忆时钟已到达临界点，现在是重置遗忘曲线的最佳时刻。' : '所有记忆节点均在安全期内，你可以通过自主练习来强化神经连接。'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold">{dueCount}</span>
            <span className="mb-2 text-lg font-medium opacity-80">个待复习</span>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col gap-4">
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
                <p className="text-xs text-gray-400 mt-1">随机抽取 20 个单词强化。</p>
            </div>

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
                <p className="text-xs text-gray-400 mt-1">AI 智能生成详细词卡。</p>
            </div>
        </div>
      </div>

      {/* Algorithm Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={onViewList} className="cursor-pointer bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center gap-1 hover:border-blue-200 transition-colors">
           <div className="p-1.5 bg-blue-50 text-blue-500 rounded-full mb-1">
              <Book size={16} />
           </div>
           <div>
               <span className="text-xl font-bold text-gray-800">{words.length}</span>
               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">词汇总量</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center gap-1">
           <div className="p-1.5 bg-green-50 text-green-500 rounded-full mb-1">
              <GraduationCap size={16} />
           </div>
           <div>
              <span className="text-xl font-bold text-green-600">{masteredCount}</span>
              <p className="text-[10px] uppercase font-bold text-green-600/60 tracking-wider">已掌握 (S{'>'}40)</p>
           </div>
        </div>
        
        {/* New FSRS Metrics */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center gap-1">
           <div className="p-1.5 bg-purple-50 text-purple-500 rounded-full mb-1">
              <Zap size={16} />
           </div>
           <div>
              <span className="text-xl font-bold text-purple-600">{avgStrength}</span>
              <p className="text-[10px] uppercase font-bold text-purple-600/60 tracking-wider">Avg Strength (天)</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center gap-1">
           <div className="p-1.5 bg-amber-50 text-amber-500 rounded-full mb-1">
              <Scale size={16} />
           </div>
           <div>
              <span className="text-xl font-bold text-amber-600">{avgDifficulty}</span>
              <p className="text-[10px] uppercase font-bold text-amber-600/60 tracking-wider">Avg Difficulty (1-10)</p>
           </div>
        </div>
      </div>

      {/* Row 1: Retention & Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Retention Heatmap */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity size={16} /> 记忆留存分布 (Retention R)
            </h3>
            <div className="h-40 w-full flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={retentionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {retentionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip unit="个" />} />
                        <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                            iconSize={8}
                            wrapperStyle={{fontSize: '10px', color: '#64748b'}}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Chart 2: Future Forecast */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BrainCircuit size={16} /> 7日复习预测 (Forecast)
            </h3>
            <div className="h-40 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="个" />} cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                        {forecastData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : '#cbd5e1'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Row 2: Stability & Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 3: Stability Maturity Distribution */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Layers size={16} /> 记忆成熟度 (Stability Days)
            </h3>
            <div className="h-40 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stabilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="个" />} cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                        {stabilityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Chart 4: Difficulty Distribution */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BarChart3 size={16} /> 单词难度分布 (Difficulty 1-10)
            </h3>
            <div className="h-40 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="level" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="个" />} cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Row 3: Habits Heatmap */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
           {/* Decorative background blur */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>

           <div className="flex justify-between items-end mb-4 relative z-10">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <CalendarDays size={16} /> 学习热力图 (Habit Heatmap)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">点亮每一个方块，见证记忆的复利效应。</p>
                </div>
                <div className="text-right">
                     <span className="text-2xl font-bold text-gray-800">{last30DaysCount}</span>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">近30天复习总数</p>
                </div>
           </div>
           
           <div className="w-full overflow-x-auto pb-2 relative z-10 custom-scrollbar">
                 <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
                     {heatmapData.map((day, i) => (
                         <div 
                            key={day.date}
                            className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 hover:shadow-sm cursor-pointer ${getHeatmapColor(day.level)}`}
                            title={`${day.date}: ${day.count} words`}
                         />
                     ))}
                 </div>
           </div>

           <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-[10px] text-gray-400 font-medium">Less</span>
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-200"></div>
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-400"></div>
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-600"></div>
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary-800"></div>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">More</span>
           </div>
      </div>

    </div>
  );
};

export default Dashboard;
