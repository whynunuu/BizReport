import React from 'react';
import { Filter, RotateCcw, BookOpen, Users, ShoppingBag } from 'lucide-react';
import { CalendarFilters, EducationLevel, TargetPersona, IndustryCategory } from '../types/calendar';

interface SidebarFilterProps {
  filters: CalendarFilters;
  onFilterChange: (filters: CalendarFilters) => void;
  onReset: () => void;
}

const EDUCATION_OPTIONS: { label: string; value: EducationLevel; desc: string }[] = [
  { label: 'SD (Sekolah Dasar)', value: 'SD', desc: 'Usia 6-12 tahun' },
  { label: 'SMP (Menengah Pertama)', value: 'SMP', desc: 'Usia 12-15 tahun' },
  { label: 'SMA / SMK', value: 'SMA', desc: 'Usia 15-18 tahun' },
  { label: 'Kampus / Kuliah', value: 'KAMPUS', desc: 'Mahasiswa & Gen-Z' },
];

const PERSONA_OPTIONS: { label: string; value: TargetPersona; role: string }[] = [
  { label: 'Orang Tua / Wali Murid', value: 'Orang Tua', role: 'Pembayar Utama (Payer)' },
  { label: 'Siswa / Remaja', value: 'Siswa', role: 'Pengguna Produk (Consumer)' },
  { label: 'Guru & Pendidik', value: 'Guru', role: 'Apresiasi & B2B Edukasi' },
  { label: 'Keluarga', value: 'Keluarga', role: 'Liburan & Makan Bersama' },
];

const INDUSTRY_OPTIONS: { label: IndustryCategory; icon: string }[] = [
  { label: 'ATK & Buku', icon: '✏️' },
  { label: 'Fashion & Seragam', icon: '👔' },
  { label: 'F&B & Bekal Sehat', icon: '🍱' },
  { label: 'Bimbel & EdTech', icon: '💡' },
  { label: 'Gadget & Elektronik', icon: '💻' },
  { label: 'Wisata & Hiburan', icon: '🎡' },
];

export const SidebarFilter: React.FC<SidebarFilterProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const toggleEducation = (level: EducationLevel) => {
    const exists = filters.selectedEducation.includes(level);
    const updated = exists
      ? filters.selectedEducation.filter(l => l !== level)
      : [...filters.selectedEducation, level];
    onFilterChange({ ...filters, selectedEducation: updated });
  };

  const togglePersona = (persona: TargetPersona) => {
    const exists = filters.selectedPersonas.includes(persona);
    const updated = exists
      ? filters.selectedPersonas.filter(p => p !== persona)
      : [...filters.selectedPersonas, persona];
    onFilterChange({ ...filters, selectedPersonas: updated });
  };

  const toggleIndustry = (industry: IndustryCategory) => {
    const exists = filters.selectedIndustries.includes(industry);
    const updated = exists
      ? filters.selectedIndustries.filter(i => i !== industry)
      : [...filters.selectedIndustries, industry];
    onFilterChange({ ...filters, selectedIndustries: updated });
  };

  const hasActiveFilters =
    filters.selectedEducation.length > 0 ||
    filters.selectedPersonas.length > 0 ||
    filters.selectedIndustries.length > 0 ||
    filters.selectedCategory !== 'all' ||
    Boolean(filters.searchQuery);

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header Filter */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-brand-600" />
          <span>Filter Segmen</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* 1. Jenjang Sekolah */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Jenjang Pendidikan</span>
        </div>
        <div className="space-y-2">
          {EDUCATION_OPTIONS.map((edu) => {
            const isChecked = filters.selectedEducation.includes(edu.value);
            return (
              <label
                key={edu.value}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleEducation(edu.value)}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">{edu.label}</div>
                  <div className="text-slate-400 text-[11px]">{edu.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Target Persona */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>Target Persona</span>
        </div>
        <div className="space-y-2">
          {PERSONA_OPTIONS.map((p) => {
            const isChecked = filters.selectedPersonas.includes(p.value);
            return (
              <label
                key={p.value}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePersona(p.value)}
                  className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">{p.label}</div>
                  <div className="text-slate-400 text-[11px]">{p.role}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Industri Bisnis */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
          <span>Kategori Produk</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {INDUSTRY_OPTIONS.map((ind) => {
            const isSelected = filters.selectedIndustries.includes(ind.label);
            return (
              <button
                key={ind.label}
                type="button"
                onClick={() => toggleIndustry(ind.label)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-sm font-semibold'
                    : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                }`}
              >
                <span>{ind.icon}</span>
                <span>{ind.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Marketing Tips Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 text-xs text-amber-900 space-y-1.5">
        <div className="font-bold flex items-center gap-1.5 text-amber-800">
          <span>💡</span>
          <span>Tips Marketing Sekolah</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-900/80">
          Untuk produk anak SD-SMP, targetkan copywriting ke <strong>kebutuhan Ibu</strong> (kemudahan, kesehatan anak). Untuk SMA, targetkan konten ke <strong>gaya & rasa percaya diri anak</strong>.
        </p>
      </div>
    </aside>
  );
};
