import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SidebarFilter } from './components/SidebarFilter';
import { CalendarGridView } from './components/CalendarGridView';
import { BentoCardView } from './components/BentoCardView';
import { EventDetailDrawer } from './components/EventDetailDrawer';
import { CalendarFilters, MarketingEvent } from './types/calendar';
import rawEventsData from './data/school_marketing_events.json';
import foxePipelineData from './data/foxe_studio_pipeline.json';
import { filterEvents, isLeadTimeActive } from './utils/calendarHelpers';
import { 
  Camera, 
  Globe, 
  Palette, 
  Send, 
  Target, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Copy, 
  TrendingUp,
  X,
  Calendar as CalendarIcon,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const INITIAL_FILTERS: CalendarFilters = {
  searchQuery: '',
  selectedEducation: [],
  selectedPersonas: [],
  selectedIndustries: [],
  selectedCategory: 'all',
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function App() {
  // Application Mode: 'general' | 'foxe'
  const [appMode, setAppMode] = useState<'general' | 'foxe'>('foxe'); // Default to Foxe pipeline
  const [events] = useState<MarketingEvent[]>(rawEventsData as MarketingEvent[]);
  const [filters, setFilters] = useState<CalendarFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'bento'>('grid');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 22));
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);

  // Foxe Studio Pipeline State
  const [foxeViewMode, setFoxeViewMode] = useState<'grid' | 'cards'>('grid');
  const [foxeMonth, setFoxeMonth] = useState<string>('2026-10');
  const [foxeStatusFilter, setFoxeStatusFilter] = useState<'all' | 'belum_tergarap' | 'tergarap'>('all');
  const [foxeState, setFoxeState] = useState<Record<string, boolean>>({});
  const [showPricelistModal, setShowPricelistModal] = useState<boolean>(false);
  const [selectedFoxeContent, setSelectedFoxeContent] = useState<{ week: any; content: any } | null>(null);

  // Load Foxe state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('foxe_studio_pipeline_state_v2');
      if (saved) setFoxeState(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveFoxeState = (updated: Record<string, boolean>) => {
    setFoxeState(updated);
    try {
      localStorage.setItem('foxe_studio_pipeline_state_v2', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const getTaskKey = (weekId: string, contentId: string, taskId: string) => `${weekId}__${contentId}__${taskId}`;

  const toggleFoxeContentTask = (weekId: string, contentId: string, taskId: string) => {
    const key = getTaskKey(weekId, contentId, taskId);
    const updated = { ...foxeState, [key]: !foxeState[key] };
    saveFoxeState(updated);
  };

  const isContentFullyDone = (week: any, content: any) => {
    return content.checklist.every((t: any) => Boolean(foxeState[getTaskKey(week.id, content.id, t.id)]));
  };

  const isWeekFullyDone = (week: any) => {
    return week.weekly_contents.every((c: any) => isContentFullyDone(week, c));
  };

  const toggleFoxeWeekStatus = (weekId: string) => {
    const week = foxePipelineData.find(w => w.id === weekId);
    if (!week) return;
    const isDone = isWeekFullyDone(week);
    const targetState = !isDone;
    const updated = { ...foxeState };

    week.weekly_contents.forEach((c: any) => {
      c.checklist.forEach((t: any) => {
        updated[getTaskKey(week.id, c.id, t.id)] = targetState;
      });
    });

    saveFoxeState(updated);
  };

  // Filtered General Events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, filters);
  }, [events, filters]);

  // Urgent lead-time events
  const urgentLeadTimeEvents = useMemo(() => {
    return events.filter(ev => isLeadTimeActive(ev, currentDate));
  }, [events, currentDate]);

  // Foxe Filtered Cards & Stats
  const foxeMonthWeeks = useMemo(() => {
    if (foxeMonth === 'all') return foxePipelineData;
    return foxePipelineData.filter(c => c.month === foxeMonth);
  }, [foxeMonth]);

  const foxeProgress = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;

    foxeMonthWeeks.forEach(w => {
      w.weekly_contents.forEach((c: any) => {
        c.checklist.forEach((t: any) => {
          totalTasks++;
          if (foxeState[getTaskKey(w.id, c.id, t.id)]) completedTasks++;
        });
      });
    });

    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, pct };
  }, [foxeMonthWeeks, foxeState]);

  const displayedFoxeWeeks = useMemo(() => {
    if (foxeStatusFilter === 'all') return foxeMonthWeeks;
    return foxeMonthWeeks.filter(w => {
      const isDone = isWeekFullyDone(w);
      return foxeStatusFilter === 'tergarap' ? isDone : !isDone;
    });
  }, [foxeMonthWeeks, foxeStatusFilter, foxeState]);

  // Foxe Calendar Grid Days calculation
  const foxeCalendarGridDays = useMemo(() => {
    const activeMonthStr = foxeMonth === 'all' ? '2026-10' : foxeMonth;
    const [yStr, mStr] = activeMonthStr.split('-');
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;

    const firstDay = new Date(year, monthIdx, 1);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const cells: Array<{
      dayNumber: number | null;
      isoDate: string;
      isWeekend: boolean;
      uploadContents: Array<{ week: any; content: any }>;
      produksiWeeks: any[];
      peakWeeks: any[];
    }> = [];

    // Empty offset days
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({
        dayNumber: null,
        isoDate: '',
        isWeekend: false,
        uploadContents: [],
        produksiWeeks: [],
        peakWeeks: []
      });
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dObj = new Date(year, monthIdx, day);
      const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

      const uploadContents: Array<{ week: any; content: any }> = [];
      foxePipelineData.forEach(w => {
        w.weekly_contents.forEach((c: any) => {
          if (c.target_date === iso) uploadContents.push({ week: w, content: c });
        });
      });

      const produksiWeeks = foxePipelineData.filter(w => w.production_window && w.production_window.days && w.production_window.days.includes(iso));
      const peakWeeks = foxePipelineData.filter(w => w.peak_days && w.peak_days.includes(iso));

      cells.push({
        dayNumber: day,
        isoDate: iso,
        isWeekend,
        uploadContents,
        produksiWeeks,
        peakWeeks
      });
    }

    return cells;
  }, [foxeMonth]);

  const prevFoxeMonth = () => {
    const months = ['2026-10', '2026-11', '2026-12'];
    const idx = months.indexOf(foxeMonth === 'all' ? '2026-10' : foxeMonth);
    if (idx > 0) setFoxeMonth(months[idx - 1]);
  };

  const nextFoxeMonth = () => {
    const months = ['2026-10', '2026-11', '2026-12'];
    const idx = months.indexOf(foxeMonth === 'all' ? '2026-10' : foxeMonth);
    if (idx < months.length - 1) setFoxeMonth(months[idx + 1]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500 selection:text-white font-sans">
      
      {/* Top Application Bar with Mode Switcher */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Branding Logo */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
                appMode === 'foxe' ? 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/20' : 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20'
              }`}>
                {appMode === 'foxe' ? <Camera className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-slate-900">
                    {appMode === 'foxe' ? 'Foxe Studio' : 'EduMark'}
                  </h1>
                  <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                    appMode === 'foxe' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {appMode === 'foxe' ? 'Pipeline Marketing' : 'K-12 Calendar'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {appMode === 'foxe' ? 'Jadwal Konten 3x/Mgg, Produksi H-14 & Hardselling Paket' : 'Kalender Marketing Edukasi & Sekolah Indonesia'}
                </p>
              </div>
            </div>

            {/* MAIN MODE SWITCHER: GENERAL vs FOTO STUDIO */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setAppMode('general')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  appMode === 'general' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Mode General</span>
              </button>
              <button
                onClick={() => setAppMode('foxe')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  appMode === 'foxe' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4 text-orange-500" />
                <span>Foto Studio (Foxe)</span>
              </button>
            </div>

            {/* Right Action */}
            <div className="flex items-center gap-2">
              {appMode === 'foxe' ? (
                <button
                  onClick={() => setShowPricelistModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-all"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Pricelist Foxe</span>
                </button>
              ) : (
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('bento')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${viewMode === 'bento' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    Bento
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: FOXE STUDIO PIPELINE MODE                                         */}
      {/* ========================================================================= */}
      {appMode === 'foxe' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
          
          {/* Header Banner & Progress */}
          <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-orange-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-500 text-white flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  Foxe Studio Pipeline
                </span>
                <span className="text-xs text-orange-200/80 font-medium">Jadwal Kampanye & Hardselling Mingguan</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Rencana Produksi & Upload Konten Foto Studio</h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Rules Operasional: <strong>Produksi Konten H-14 s.d H-10</strong> sebelum event. <strong>Upload Iklan/Konten H-7 s.d H-5</strong> (Frekuensi: <strong>3x Konten per Minggu</strong>).
              </p>
            </div>

            {/* Month Selector & Progress */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full md:w-80 shrink-0 space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Pilih Bulan:</span>
                <select
                  value={foxeMonth}
                  onChange={(e) => setFoxeMonth(e.target.value)}
                  className="bg-slate-800 text-xs font-bold text-orange-400 border border-slate-700 rounded-lg px-2.5 py-1 outline-none"
                >
                  <option value="2026-10">Oktober 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">Desember 2026</option>
                  <option value="all">Semua Bulan (Cards)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Status Kesiapan Konten:</span>
                  <span className="font-extrabold text-orange-400">{foxeProgress.pct}% Selesai</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${foxeProgress.pct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>{foxeProgress.completedTasks} Tugas Selesai</span>
                  <span>{foxeProgress.totalTasks} Total Tugas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Foxe Controls: Dual-View Switcher & Status Filter */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            
            {/* Left: Dual View Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setFoxeViewMode('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  foxeViewMode === 'grid' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Kalender Bulanan Penuh</span>
              </button>
              <button
                onClick={() => setFoxeViewMode('cards')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  foxeViewMode === 'cards' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu Mingguan (3 Konten/Mgg)</span>
              </button>
            </div>

            {/* Right: Status Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFoxeStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'all' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFoxeStatusFilter('belum_tergarap')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'belum_tergarap' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ⏳ Butuh Garap
              </button>
              <button
                onClick={() => setFoxeStatusFilter('tergarap')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'tergarap' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ✅ Sudah Tergarap
              </button>
            </div>
          </div>

          {/* VIEW 1: FULL MONTH CALENDAR GRID */}
          {foxeViewMode === 'grid' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-orange-50/40 via-white to-amber-50/30">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                    <CalendarIcon className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {foxeMonth === 'all' ? 'Oktober 2026' : `${MONTH_NAMES[parseInt(foxeMonth.split('-')[1], 10) - 1]} ${foxeMonth.split('-')[0]}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Kalender 1 bulan penuh: plotting hari produksi (H-12), 3x upload konten (H-7..H-5), dan peak event</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={prevFoxeMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all shadow-2xs">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={nextFoxeMonth} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all shadow-2xs">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-500 py-2.5">
                <div>Senin</div><div>Selasa</div><div>Rabu</div><div>Kamis</div><div>Jumat</div><div className="text-rose-500">Sabtu</div><div className="text-rose-500">Minggu</div>
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
                {foxeCalendarGridDays.map((cell, idx) => {
                  if (!cell.dayNumber) {
                    return <div key={idx} className="min-h-[120px] bg-slate-50/40 p-2 text-slate-300" />;
                  }

                  return (
                    <div key={cell.isoDate} className="min-h-[120px] p-2 transition-all flex flex-col bg-white hover:bg-slate-50/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          cell.isWeekend ? 'text-rose-600 bg-rose-50' : 'text-slate-700 bg-slate-100'
                        }`}>
                          {cell.dayNumber}
                        </span>
                      </div>

                      <div className="space-y-1 flex-1 overflow-y-auto max-h-[90px] no-scrollbar">
                        {/* Peak Momen */}
                        {cell.peakWeeks.map((w: any) => (
                          <div key={w.id} className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 truncate flex items-center gap-1 shadow-2xs" title={w.event_title}>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="truncate">🎯 PEAK: {w.event_title.split('&')[0].trim()}</span>
                          </div>
                        ))}

                        {/* Upload Konten #1, #2, #3 */}
                        {cell.uploadContents.map(({ week, content }) => {
                          const isDone = isContentFullyDone(week, content);
                          return (
                            <button
                              key={content.id}
                              onClick={() => setSelectedFoxeContent({ week, content })}
                              className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold border transition-all truncate flex items-center justify-between gap-1 shadow-2xs ${
                                isDone 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-orange-50 text-orange-800 border-orange-200 hover:brightness-95'
                              }`}
                              title={`${content.title} (${content.package_featured})`}
                            >
                              <div className="truncate flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-orange-500'} shrink-0`} />
                                <span className="truncate">🚀 {content.slot_label.split(' ')[0]}: {content.title}</span>
                              </div>
                              <span className={`text-[9px] px-1 py-0.2 rounded ${isDone ? 'bg-emerald-200 text-emerald-900' : 'bg-orange-200 text-orange-900'} shrink-0`}>
                                {isDone ? '✓' : 'Garap'}
                              </span>
                            </button>
                          );
                        })}

                        {/* Produksi Konten Badge */}
                        {cell.produksiWeeks.map((w: any) => (
                          <div key={w.id} className="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 truncate flex items-center gap-1" title={`Periode Produksi: ${w.event_title}`}>
                            <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                            <span className="truncate">🎨 Produksi: {w.event_title.split('&')[0].trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Legend */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
                <span className="font-bold text-slate-600">Keterangan Warna Tanggal:</span>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-purple-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Produksi Konten (H-14 s.d H-10)</span>
                  <span className="flex items-center gap-1.5 text-orange-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Upload Konten #1, #2, #3 (H-7 s.d H-5)</span>
                  <span className="flex items-center gap-1.5 text-rose-800 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Momen Peak / Hari-H</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: WEEKLY CARDS (3 KONTEN PER MINGGU) */}
          {foxeViewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {displayedFoxeWeeks.map((w: any) => {
                const isWeekDone = isWeekFullyDone(w);

                return (
                  <div
                    key={w.id}
                    className={`bg-white rounded-3xl border transition-all p-6 shadow-sm hover:shadow-md flex flex-col justify-between ${
                      isWeekDone ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
                          {w.week_label}
                        </span>
                        <button
                          onClick={() => toggleFoxeWeekStatus(w.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            isWeekDone ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isWeekDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isWeekDone ? 'Semua Tergarap' : 'Belum Selesai'}</span>
                        </button>
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                        {w.event_title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {w.seasonality_context}
                      </p>

                      {/* Timeline 3 Phases */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                        <div className="p-2 rounded-xl bg-purple-50 border border-purple-200/80">
                          <div className="text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1 mb-0.5">
                            <Palette className="w-3 h-3 text-purple-600" /> Produksi
                          </div>
                          <div className="font-bold text-slate-900 text-[11px]">{w.production_window.label}</div>
                        </div>

                        <div className="p-2 rounded-xl bg-orange-50 border border-orange-200/80">
                          <div className="text-[10px] font-bold text-orange-700 uppercase flex items-center gap-1 mb-0.5">
                            <Send className="w-3 h-3 text-orange-600" /> Upload
                          </div>
                          <div className="font-bold text-slate-900 text-[11px]">{w.upload_window.label}</div>
                        </div>

                        <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/80">
                          <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1 mb-0.5">
                            <Target className="w-3 h-3 text-blue-600" /> Peak Event
                          </div>
                          <div className="font-bold text-slate-900 text-[11px]">{w.peak_event_date}</div>
                        </div>
                      </div>

                      {/* Hard Selling Packages */}
                      <div className="space-y-2 mb-4">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Urutan Paket Hardselling:</span>
                          <span className="text-[11px] text-orange-600 font-bold">Pricelist Foxe</span>
                        </div>
                        <div className="space-y-1.5">
                          {w.hard_selling_packages.map((p: any) => (
                            <div key={p.name} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black shrink-0">
                                  #{p.rank}
                                </span>
                                <span className="font-bold text-slate-900 truncate">{p.name}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200 shrink-0">{p.badge}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-orange-600">{p.price_label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3 Weekly Contents */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                          <span>3 Rencana Konten Minggu Ini:</span>
                          <span className="text-[11px] text-orange-600 font-bold">3x Konten per Minggu</span>
                        </div>

                        <div className="space-y-3">
                          {w.weekly_contents.map((c: any) => {
                            const isDone = isContentFullyDone(w, c);
                            return (
                              <div
                                key={c.id}
                                className={`p-3.5 rounded-2xl border transition-all ${
                                  isDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                                    {c.slot_label}
                                  </span>
                                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded">
                                    Target Upload: {c.target_date}
                                  </span>
                                </div>

                                <div className="font-bold text-slate-900 text-xs mb-1">{c.title}</div>
                                <div className="text-[11px] text-slate-500 mb-2 flex items-center gap-2">
                                  <span>📦 <strong>Paket:</strong> {c.package_featured}</span>
                                  <span>•</span>
                                  <span>🎥 <strong>Format:</strong> {c.format}</span>
                                </div>

                                {/* Copywriting Hook */}
                                <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono leading-relaxed relative group mb-2.5">
                                  <div className="text-[9px] uppercase tracking-wider text-orange-400 font-bold mb-1 flex justify-between">
                                    <span>Hook Video:</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(c.hook);
                                        alert('Hook konten tersalin!');
                                      }}
                                      className="text-[9px] text-slate-300 hover:text-white underline"
                                    >
                                      Salin Hook
                                    </button>
                                  </div>
                                  "{c.hook}"
                                </div>

                                {/* Checklist Tasks */}
                                <div className="space-y-1">
                                  {c.checklist.map((t: any) => {
                                    const taskDone = Boolean(foxeState[getTaskKey(w.id, c.id, t.id)]);
                                    return (
                                      <label
                                        key={t.id}
                                        className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-all ${
                                          taskDone ? 'text-emerald-900 font-medium line-through' : 'text-slate-700'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={taskDone}
                                          onChange={() => toggleFoxeContentTask(w.id, c.id, t.id)}
                                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span className="text-[11px]">{t.task}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: GENERAL K-12 CALENDAR MODE                                        */
        /* ========================================================================= */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <SidebarFilter
              filters={filters}
              onFilterChange={setFilters}
              onReset={() => setFilters(INITIAL_FILTERS)}
            />

            <div className="flex-1 w-full space-y-5">
              {urgentLeadTimeEvents.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Action Alert: Persiapan Iklan Segera!</h4>
                      <p className="text-xs text-blue-100">
                        Ada {urgentLeadTimeEvents.length} momen penting yang memasuki masa persiapan iklan (lead-time H-14 s.d H-30).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {urgentLeadTimeEvents.slice(0, 2).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all shadow-xs"
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'grid' ? (
                <CalendarGridView
                  events={filteredEvents}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onSelectEvent={setSelectedEvent}
                />
              ) : (
                <BentoCardView
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                />
              )}
            </div>
          </div>
        </main>
      )}

      {/* General Event Detail Drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* FOXE PRICELIST MODAL */}
      {showPricelistModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div onClick={() => setShowPricelistModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    📸
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900">Pricelist Resmi Foxe Studio</h3>
                    <p className="text-xs text-slate-500">Acuan tarif dasar untuk strategi hardselling dan bundling promo</p>
                  </div>
                </div>
                <button onClick={() => setShowPricelistModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Graduation</span>
                    <span className="text-orange-600 font-extrabold">Rp 350.000</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Min 3 orang, include toga props standar & 3 tema background.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Graduation Premium</span>
                    <span className="text-orange-600 font-extrabold">Rp 500.000</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Min 3 orang, bonus cetak frame 12R + master retouched files.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Large Group</span>
                    <span className="text-orange-600 font-extrabold">Rp 25.000 / orang</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Min 7 orang. Paket paling laris untuk kelas & ekskul sekolah.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Photofox (Self Photo Box)</span>
                    <span className="text-orange-600 font-extrabold">Rp 200.000</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Min 3 orang, include remote shutter & full all soft files.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Family A / Family B</span>
                    <span className="text-orange-600 font-extrabold">Rp 350rb / Rp 450rb</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Min 3 orang. Family B include cetak frame premium ruang tamu.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Couple A / B / C</span>
                    <span className="text-orange-600 font-extrabold">Rp 150rb - Rp 400rb</span>
                  </div>
                  <p className="text-[11px] text-slate-600">2 orang. Cocok untuk pre-wedding kasual atau kencan aesthetic.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Pas Foto</span>
                    <span className="text-orange-600 font-extrabold">Rp 50.000</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Cetak resmi & soft file untuk ijazah, rapor, atau SNBP.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                  <div className="flex justify-between font-bold text-orange-950">
                    <span>Single (Portofolio)</span>
                    <span className="text-orange-600 font-extrabold">Rp 100.000</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Foto profil profesional LinkedIn atau portofolio pribadi.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Ketentuan Add-On Resmi:</div>
                <div>• Tambah Orang (Graduation): <strong>+Rp 20.000 / orang</strong></div>
                <div>• Tambah Orang (Photofox): <strong>+Rp 25.000 / orang</strong></div>
                <div>• Tambah Tema Background: <strong>+Rp 100.000 - Rp 175.000 / tema</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOXE CONTENT DETAIL MODAL */}
      {selectedFoxeContent && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div onClick={() => setSelectedFoxeContent(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-black uppercase">
                    {selectedFoxeContent.content.slot_label}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Target Upload: {selectedFoxeContent.content.target_date}
                  </span>
                </div>
                <button onClick={() => setSelectedFoxeContent(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="text-xs font-bold text-orange-600 mb-0.5">{selectedFoxeContent.week.event_title}</div>
                <h3 className="text-lg font-extrabold text-slate-900">{selectedFoxeContent.content.title}</h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold text-slate-700">{selectedFoxeContent.content.format}</span>
                  <span>•</span>
                  <span className="font-bold text-orange-600">Paket: {selectedFoxeContent.content.package_featured}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  <span>Hook & Copywriting Iklan:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFoxeContent.content.hook);
                      alert('Hook tersalin!');
                    }}
                    className="text-slate-300 hover:text-white underline"
                  >
                    Salin Hook
                  </button>
                </div>
                <p className="font-mono text-xs leading-relaxed text-slate-200">"{selectedFoxeContent.content.hook}"</p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <strong>Call-To-Action:</strong> {selectedFoxeContent.content.cta}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Checklist Produksi & Tayang:</span>
                  <span className={`text-[11px] ${isContentFullyDone(selectedFoxeContent.week, selectedFoxeContent.content) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    {isContentFullyDone(selectedFoxeContent.week, selectedFoxeContent.content) ? '✅ Selesai' : '⏳ Belum Selesai'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {selectedFoxeContent.content.checklist.map((t: any) => {
                    const taskDone = Boolean(foxeState[getTaskKey(selectedFoxeContent.week.id, selectedFoxeContent.content.id, t.id)]);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border ${
                          taskDone ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-medium line-through' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={taskDone}
                          onChange={() => toggleFoxeContentTask(selectedFoxeContent.week.id, selectedFoxeContent.content.id, t.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs">{t.task}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
