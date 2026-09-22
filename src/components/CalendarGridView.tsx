import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { MarketingEvent } from '../types/calendar';
import { getMonthMatrix, formatDateToISO, isEventOnDate } from '../utils/calendarHelpers';

interface CalendarGridViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: MarketingEvent[];
  onSelectEvent: (event: MarketingEvent) => void;
}

const DAYS_OF_WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  back_to_school: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  exam_period: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  school_holiday: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  national_day: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  commercial_sale: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  graduation_admissions: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
};

export const CalendarGridView: React.FC<CalendarGridViewProps> = ({
  currentDate,
  onDateChange,
  events,
  onSelectEvent,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthMatrix = getMonthMatrix(year, month);
  const todayStr = formatDateToISO(new Date());

  const handlePrevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar Header & Nav */}
      <div className="flex flex-wrap items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {MONTH_NAMES[month]} {year}
            </h2>
            <p className="text-xs text-slate-500">Klik event untuk melihat ide promosi & copywriting</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
          >
            Hari Ini
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200 text-center text-xs font-bold text-slate-500 py-2.5">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div key={day} className={idx >= 5 ? 'text-rose-500' : ''}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
        {monthMatrix.flat().map((date, idx) => {
          if (!date) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[110px] sm:min-h-[125px] bg-slate-50/40 p-2 text-slate-300"
              />
            );
          }

          const dateStr = formatDateToISO(date);
          const isToday = dateStr === todayStr;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          // Find events on this date
          const dayEvents = events.filter((ev) => isEventOnDate(ev, date));

          return (
            <div
              key={dateStr}
              className={`min-h-[110px] sm:min-h-[125px] p-2 transition-all group flex flex-col bg-white hover:bg-slate-50/80 ${
                isToday ? 'ring-2 ring-brand-500 ring-inset z-10' : ''
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                    isToday
                      ? 'bg-brand-600 text-white font-bold'
                      : isWeekend
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {date.getDate()}
                </span>
                {isToday && (
                  <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider hidden sm:inline">
                    Today
                  </span>
                )}
              </div>

              {/* Event Chips */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
                {dayEvents.slice(0, 2).map((ev) => {
                  const style = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.national_day;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-medium border ${style.bg} ${style.text} ${style.border} hover:brightness-95 transition-all truncate flex items-center gap-1.5 shadow-2xs`}
                      title={`${ev.title} (${ev.timing.start_date} s.d ${ev.timing.end_date})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}

                {dayEvents.length > 2 && (
                  <button
                    onClick={() => onSelectEvent(dayEvents[0])}
                    className="w-full text-left px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    +{dayEvents.length - 2} momen lainnya
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
        <span className="font-semibold text-slate-500">Keterangan Warna:</span>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-blue-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Back to School
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Musim Ujian
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Libur Sekolah
          </span>
          <span className="flex items-center gap-1.5 text-purple-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Hari Nasional
          </span>
          <span className="flex items-center gap-1.5 text-rose-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Promo Belanja
          </span>
          <span className="flex items-center gap-1.5 text-indigo-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> SNBP & UTBK
          </span>
        </div>
      </div>
    </div>
  );
};
