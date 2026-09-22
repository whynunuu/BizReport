import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { SidebarFilter } from './components/SidebarFilter';
import { CalendarGridView } from './components/CalendarGridView';
import { BentoCardView } from './components/BentoCardView';
import { EventDetailDrawer } from './components/EventDetailDrawer';
import { CalendarFilters, MarketingEvent } from './types/calendar';
import rawEventsData from './data/school_marketing_events.json';
import { filterEvents, isLeadTimeActive } from './utils/calendarHelpers';
import { Bell, Flame, Sparkles, TrendingUp } from 'lucide-react';

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
  const [events] = useState<MarketingEvent[]>(rawEventsData as MarketingEvent[]);
  const [filters, setFilters] = useState<CalendarFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'bento'>('grid');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 22)); // Sept 2026 anchor
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, filters);
  }, [events, filters]);

  // Urgent lead-time events (campaigns that need immediate action)
  const urgentLeadTimeEvents = useMemo(() => {
    return events.filter(ev => isLeadTimeActive(ev, currentDate));
  }, [events, currentDate]);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    setFilters(prev => ({
      ...prev,
      month: newDate.getMonth(),
      year: newDate.getFullYear(),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalEventsCount={filteredEvents.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {/* Banner Highlight: Momen Mendesak / Tips Kampanye */}
        {urgentLeadTimeEvents.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-orange-500/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-md">
                    Action Required
                  </span>
                  <span className="text-xs font-medium text-white/90">
                    Lead-Time Alert
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base mt-0.5">
                  Ada {urgentLeadTimeEvents.length} momen penting yang memasuki masa persiapan iklan!
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {urgentLeadTimeEvents.slice(0, 2).map((ev) => (
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

        {/* Layout Grid: Sidebar Filter + Content Views */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Sidebar Filter */}
          <SidebarFilter
            filters={filters}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />

          {/* Right Main View */}
          <div className="flex-1 w-full space-y-4">
            
            {/* View Stats Header */}
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <span>
                  Mode Aktif: <strong className="text-slate-800">{viewMode === 'grid' ? 'Tampilan Kalender Bulanan' : 'Kartu Inspirasi Bento'}</strong>
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Menemukan <strong className="text-brand-600">{filteredEvents.length}</strong> dari {events.length} momen
              </div>
            </div>

            {/* Render View Mode */}
            {viewMode === 'grid' ? (
              <CalendarGridView
                currentDate={currentDate}
                onDateChange={handleDateChange}
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

      </main>

      {/* Slide-over Detail Drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">EduMark - Kalender Marketing Sekolah & Edukasi Indonesia</p>
          <p className="text-[11px] text-slate-400">
            Dirancang khusus untuk brand, UMKM, agen periklanan, dan kreator konten yang menyasar siswa K-12, orang tua murid, dan pendidik.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
