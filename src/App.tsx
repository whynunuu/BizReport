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
  X
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

export function App() {
  // Application Mode: 'general' | 'foxe'
  const [appMode, setAppMode] = useState<'general' | 'foxe'>('foxe'); // Default to Foxe pipeline
  const [events] = useState<MarketingEvent[]>(rawEventsData as MarketingEvent[]);
  const [filters, setFilters] = useState<CalendarFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'bento'>('grid');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 22));
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);

  // Foxe Studio Pipeline State
  const [foxeMonth, setFoxeMonth] = useState<string>('2026-10');
  const [foxeStatusFilter, setFoxeStatusFilter] = useState<'all' | 'belum_tergarap' | 'tergarap'>('all');
  const [foxeState, setFoxeState] = useState<Record<string, { status: string; checklist: Record<string, boolean> }>>({});
  const [showPricelistModal, setShowPricelistModal] = useState<boolean>(false);

  // Load Foxe state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('foxe_studio_pipeline_state_v1');
      if (saved) setFoxeState(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveFoxeState = (updated: Record<string, { status: string; checklist: Record<string, boolean> }>) => {
    setFoxeState(updated);
    try {
      localStorage.setItem('foxe_studio_pipeline_state_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFoxeTask = (cardId: string, taskId: string) => {
    const cardCurrent = foxeState[cardId] || { status: 'belum_tergarap', checklist: {} };
    const nextChecklist = { ...cardCurrent.checklist, [taskId]: !cardCurrent.checklist[taskId] };
    
    // Check if all are done
    const cardData = foxePipelineData.find(c => c.id === cardId);
    let nextStatus = cardCurrent.status;
    if (cardData) {
      const allDone = cardData.checklist.every(t => nextChecklist[t.id]);
      if (allDone) nextStatus = 'tergarap';
    }

    const updated = {
      ...foxeState,
      [cardId]: { status: nextStatus, checklist: nextChecklist }
    };
    saveFoxeState(updated);
  };

  const toggleFoxeCardStatus = (cardId: string) => {
    const cardCurrent = foxeState[cardId] || { status: 'belum_tergarap', checklist: {} };
    const nextStatus = cardCurrent.status === 'tergarap' ? 'belum_tergarap' : 'tergarap';
    const cardData = foxePipelineData.find(c => c.id === cardId);
    let nextChecklist = { ...cardCurrent.checklist };
    if (cardData && nextStatus === 'tergarap') {
      cardData.checklist.forEach(t => { nextChecklist[t.id] = true; });
    }

    const updated = {
      ...foxeState,
      [cardId]: { status: nextStatus, checklist: nextChecklist }
    };
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
  const foxeMonthCards = useMemo(() => {
    if (foxeMonth === 'all') return foxePipelineData;
    return foxePipelineData.filter(c => c.month === foxeMonth);
  }, [foxeMonth]);

  const foxeProgress = useMemo(() => {
    const total = foxeMonthCards.length;
    let completed = 0;
    foxeMonthCards.forEach(c => {
      if (foxeState[c.id]?.status === 'tergarap') completed++;
    });
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [foxeMonthCards, foxeState]);

  const displayedFoxeCards = useMemo(() => {
    if (foxeStatusFilter === 'all') return foxeMonthCards;
    return foxeMonthCards.filter(c => {
      const isDone = foxeState[c.id]?.status === 'tergarap';
      return foxeStatusFilter === 'tergarap' ? isDone : !isDone;
    });
  }, [foxeMonthCards, foxeStatusFilter, foxeState]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500 selection:text-white font-sans">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Branding */}
            <div className="flex items-center gap-3 shrink-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
                appMode === 'general' ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20' : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/20'
              }`}>
                {appMode === 'general' ? <Globe className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                    {appMode === 'general' ? 'EduMark' : 'Foxe Studio'}
                  </span>
                  <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                    appMode === 'general' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {appMode === 'general' ? 'K-12 Calendar' : 'Pipeline Marketing'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {appMode === 'general' ? 'Kalender Marketing Edukasi & Anak Sekolah Indonesia' : 'Jadwal Konten H-7, Produksi H-14 & Hardselling Paket'}
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
                Rules Operasional: <strong>Produksi Konten H-14 s.d H-10</strong> sebelum event. <strong>Upload Iklan/Konten H-7 s.d H-5</strong> sebelum peak event.
              </p>
            </div>

            {/* Month Selector & Progress */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full md:w-80 shrink-0 space-y-3 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Pilih Periode:</span>
                <select
                  value={foxeMonth}
                  onChange={(e) => setFoxeMonth(e.target.value)}
                  className="bg-slate-800 text-xs font-bold text-orange-400 border border-slate-700 rounded-lg px-2.5 py-1 outline-none"
                >
                  <option value="all">Semua Bulan</option>
                  <option value="2026-10">Oktober 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">Desember 2026</option>
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
                  <span>{foxeProgress.completed} Tergarap</span>
                  <span>{foxeProgress.total} Total Jadwal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFoxeStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'all' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Semua Jadwal
              </button>
              <button
                onClick={() => setFoxeStatusFilter('belum_tergarap')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'belum_tergarap' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ⏳ Butuh Garap Segera
              </button>
              <button
                onClick={() => setFoxeStatusFilter('tergarap')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${foxeStatusFilter === 'tergarap' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                ✅ Sudah Tergarap
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedFoxeCards.map(c => {
              const state = foxeState[c.id] || { status: 'belum_tergarap', checklist: {} };
              const isTergarap = state.status === 'tergarap';

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-3xl border transition-all p-6 shadow-sm hover:shadow-md flex flex-col justify-between ${
                    isTergarap ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
                        {c.week_label}
                      </span>
                      <button
                        onClick={() => toggleFoxeCardStatus(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          isTergarap ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isTergarap ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>{isTergarap ? 'Sudah Tergarap' : 'Belum Tergarap'}</span>
                      </button>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                      {c.event_title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {c.seasonality_context}
                    </p>

                    {/* Timeline 3 Phases */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                      <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/70">
                        <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Palette className="w-3 h-3 text-purple-600" />
                          <span>Produksi Konten</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">{c.production_window.label}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200/70">
                        <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Send className="w-3 h-3 text-orange-600" />
                          <span>Jadwal Upload</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">{c.upload_window.label}</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70">
                        <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Target className="w-3 h-3 text-blue-600" />
                          <span>Momen Peak</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs">{c.peak_event_date}</div>
                      </div>
                    </div>

                    {/* Hard Selling Packages */}
                    <div className="space-y-2 mb-4">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Urutan Paket Hardselling:</span>
                        <span className="text-[11px] text-orange-600 font-bold">Pricelist Resmi Foxe</span>
                      </div>
                      <div className="space-y-2">
                        {c.hard_selling_packages.map(p => (
                          <div key={p.name} className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-orange-200 transition-all flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-black">
                                  #{p.rank}
                                </span>
                                <span className="font-bold text-xs text-slate-900">{p.name}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">{p.badge}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed pl-7">{p.selling_point}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-xs text-orange-600">{p.price_label}</div>
                              <div className="text-[10px] text-slate-400">{p.unit}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Content Hook */}
                    <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-1.5 mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center justify-between">
                        <span>Ide Hook & Copywriting Konten:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(c.content_strategy.hook);
                            alert('Hook konten tersalin!');
                          }}
                          className="text-[10px] text-slate-300 hover:text-white underline"
                        >
                          Salin
                        </button>
                      </div>
                      <p className="font-mono text-slate-200 text-xs leading-relaxed">"{c.content_strategy.hook}"</p>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                        <span>Format: {c.content_strategy.content_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Checklist Pengerjaan:</span>
                      <span className="text-[10px] font-medium text-slate-400">Centang saat selesai</span>
                    </div>
                    <div className="space-y-1.5">
                      {c.checklist.map(t => {
                        const isDone = Boolean(state.checklist[t.id]);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border ${
                              isDone ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-medium line-through' : 'border-slate-100 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleFoxeTask(c.id, t.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs">{t.task}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

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
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  <span>Mode: <strong>{viewMode === 'grid' ? 'Tampilan Kalender Bulanan' : 'Kartu Bento'}</strong></span>
                </div>
                <div className="text-xs text-slate-500">
                  Menemukan <strong className="text-brand-600">{filteredEvents.length}</strong> momen
                </div>
              </div>

              {viewMode === 'grid' ? (
                <CalendarGridView
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  events={filteredEvents}
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

          <EventDetailDrawer
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </main>
      )}

      {/* FOXE PRICELIST MODAL */}
      {showPricelistModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div onClick={() => setShowPricelistModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">📸</span>
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
                <p className="text-[11px] text-slate-600">Min 3 orang, Add/person Rp 20k, Add/theme Rp 150k</p>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-1">
                <div className="flex justify-between font-bold text-orange-950">
                  <span>Graduation Premium</span>
                  <span className="text-orange-600 font-extrabold">Rp 500.000</span>
                </div>
                <p className="text-[11px] text-slate-600">Min 3 orang, All files + Cetak frame premium</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Large Group (Sekolah/Kelas)</span>
                  <span className="text-blue-600 font-extrabold">Rp 25.000 / pax</span>
                </div>
                <p className="text-[11px] text-slate-500">Min 7 orang, Add/theme Rp 175k (Volume Driver)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Photofox (Self Photo Box)</span>
                  <span className="text-blue-600 font-extrabold">Rp 200.000</span>
                </div>
                <p className="text-[11px] text-slate-500">Min 3 orang, Add/person Rp 25k, Add/theme Rp 100k</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Family A / Family B</span>
                  <span className="text-slate-800 font-extrabold">Rp 350k - Rp 450k</span>
                </div>
                <p className="text-[11px] text-slate-500">Min 3 orang, paket keluarga inti s.d besar</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Couple A / B / C</span>
                  <span className="text-slate-800 font-extrabold">Rp 150k / 200k / 400k</span>
                </div>
                <p className="text-[11px] text-slate-500">2 orang, sesi santai s.d intimate anniversary</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">EduMark × Foxe Studio - Sistem Kalender Marketing Terpadu</p>
      </footer>

    </div>
  );
}

export default App;
