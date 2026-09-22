import React from 'react';
import { Calendar as CalendarIcon, LayoutGrid, Search, X, Sparkles, GraduationCap } from 'lucide-react';
import { CalendarFilters, EventCategory } from '../types/calendar';

interface NavbarProps {
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
  viewMode: 'grid' | 'bento';
  onViewModeChange: (mode: 'grid' | 'bento') => void;
  totalEventsCount: number;
}

const QUICK_CATEGORIES: { label: string; value: string; icon: string }[] = [
  { label: 'Semua Momen', value: 'all', icon: '✨' },
  { label: 'Back to School', value: 'back_to_school', icon: '🎒' },
  { label: 'Musim Ujian', value: 'exam_period', icon: '📝' },
  { label: 'Libur Sekolah', value: 'school_holiday', icon: '🏖️' },
  { label: 'Hari Nasional', value: 'national_day', icon: '🇮🇩' },
  { label: 'Promo Belanja', value: 'commercial_sale', icon: '🛍️' },
  { label: 'SNBP & UTBK', value: 'graduation_admissions', icon: '🎓' },
];

export const Navbar: React.FC<NavbarProps> = ({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalEventsCount,
}) => {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleClearSearch = () => {
    onFilterChange({
      ...filters,
      searchQuery: '',
    });
  };

  const handleCategoryClick = (catValue: string) => {
    onFilterChange({
      ...filters,
      selectedCategory: catValue,
    });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">EduMark</span>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                  K-12 Calendar
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Kalender Marketing Edukasi & Anak Sekolah Indonesia</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={handleSearch}
                placeholder="Cari event, ujian, tanggal kembar, atau produk..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-sm text-slate-800 placeholder-slate-400 border border-transparent focus:border-brand-500 rounded-xl outline-none transition-all"
              />
              {filters.searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Kalender Bulanan"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden md:inline">Kalender</span>
              </button>
              <button
                onClick={() => onViewModeChange('bento')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'bento'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Kartu Inspirasi Bento"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Kartu Inspirasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Kategori Cepat:</span>
          </div>
          {QUICK_CATEGORIES.map((cat) => {
            const isActive = filters.selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
          
          <div className="ml-auto text-xs text-slate-500 shrink-0 font-medium pl-2 hidden md:block">
            Menampilkan <span className="font-bold text-slate-800">{totalEventsCount}</span> momen
          </div>
        </div>
      </div>
    </header>
  );
};
