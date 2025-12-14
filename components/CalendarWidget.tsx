import React from 'react';
import { DailyStat } from '../types';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CalendarWidgetProps {
  history: DailyStat[];
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ history }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = history.find(h => h.date === dateStr);
    return entry && entry.count > 0;
  };

  const renderDays = () => {
    const days = [];
    // Padding for empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDay = today.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const hasCheckedIn = getDayStatus(day);
      const isToday = isCurrentMonth && day === todayDay;
      
      days.push(
        <div key={day} className="flex flex-col items-center justify-center h-9 w-9 relative">
          <div 
            className={`
              h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
              ${isToday ? 'border-2 border-primary-500 text-primary-600' : ''}
              ${hasCheckedIn ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400 hover:bg-gray-50'}
            `}
          >
            {day}
            {hasCheckedIn && (
                <div className="absolute -bottom-1">
                    <div className="bg-green-500 rounded-full p-[1px] border border-white">
                        <Check size={8} className="text-white" strokeWidth={4} />
                    </div>
                </div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            打卡日历
        </h3>
        <div className="flex items-center gap-4 text-gray-700">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={16}/></button>
            <span className="font-bold text-sm">{year}年 {monthNames[month]}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={16}/></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-xs text-gray-400 font-bold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 justify-items-center">
        {renderDays()}
      </div>
    </div>
  );
};

export default CalendarWidget;