import React from 'react';
import { Clock, Calendar, ArrowRight, Sparkles, Tag, Users } from 'lucide-react';
import { MarketingEvent } from '../types/calendar';
import { calculateCountdown, isLeadTimeActive } from '../utils/calendarHelpers';

interface BentoCardViewProps {
  events: MarketingEvent[];
  onSelectEvent: (event: MarketingEvent) => void;
}

const CATEGORY_THEMES: Record<string, { bg: string; border: string; badge: string; accent: string }> = {
  back_to_school: {
    bg: 'bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40',
    border: 'border-blue-100 hover:border-blue-300',
    badge: 'bg-blue-100/80 text-blue-700',
    accent: 'text-blue-600',
  },
  exam_period: {
    bg: 'bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/40',
    border: 'border-amber-100 hover:border-amber-300',
    badge: 'bg-amber-100/80 text-amber-700',
    accent: 'text-amber-600',
  },
  school_holiday: {
    bg: 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40',
    border: 'border-emerald-100 hover:border-emerald-300',
    badge: 'bg-emerald-100/80 text-emerald-700',
    accent: 'text-emerald-600',
  },
  national_day: {
    bg: 'bg-gradient-to-br from-purple-50/70 via-white to-fuchsia-50/40',
    border: 'border-purple-100 hover:border-purple-300',
    badge: 'bg-purple-100/80 text-purple-700',
    accent: 'text-purple-600',
  },
  commercial_sale: {
    bg: 'bg-gradient-to-br from-rose-50/70 via-white to-pink-50/40',
    border: 'border-rose-100 hover:border-rose-300',
    badge: 'bg-rose-100/80 text-rose-700',
    accent: 'text-rose-600',
  },
  graduation_admissions: {
    bg: 'bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40',
    border: 'border-indigo-100 hover:border-indigo-300',
    badge: 'bg-indigo-100/80 text-indigo-700',
    accent: 'text-indigo-600',
  },
};

export const BentoCardView: React.FC<BentoCardViewProps> = ({
  events,
  onSelectEvent,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Tidak ada momen yang cocok</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Coba atur ulang kata kunci pencarian atau sesuaikan filter jenjang dan industri di sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {events.map((event) => {
        const countdown = calculateCountdown(event.timing.start_date);
        const inLeadTime = isLeadTimeActive(event);
        const theme = CATEGORY_THEMES[event.category] || CATEGORY_THEMES.national_day;

        return (
          <div
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className={`rounded-2xl border ${theme.border} ${theme.bg} p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
          >
            {/* Lead Time Alert Ribbon */}
            {inLeadTime && (
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Mulai Iklan Sekarang!
              </div>
            )}

            <div>
              {/* Card Header: Dates & Countdown Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/90 px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {event.timing.start_date}
                    {event.timing.start_date !== event.timing.end_date && ` - ${event.timing.end_date}`}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs ${
                    countdown.isOngoing
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : countdown.isPassed
                      ? 'bg-slate-100 text-slate-500'
                      : inLeadTime
                      ? 'bg-amber-500 text-white'
                      : 'bg-brand-50 text-brand-700 border border-brand-200/70'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    {countdown.isOngoing
                      ? 'Hari Ini'
                      : countdown.isPassed
                      ? 'Selesai'
                      : `H-${countdown.days} Hari`}
                  </span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h3 className="font-extrabold text-base text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight line-clamp-1">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5 mb-3">
                {event.subtitle}
              </p>

              {/* Audience Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                {event.education_level.map((lvl) => (
                  <span
                    key={lvl}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                  >
                    {lvl}
                  </span>
                ))}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  Payer: {event.primary_audience}
                </span>
              </div>

              {/* Commercial Trigger Hook */}
              <div className="p-3 rounded-xl bg-white/80 border border-slate-200/70 text-xs text-slate-700 mb-3.5 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-brand-500" />
                  <span>Peluang Penjualan:</span>
                </div>
                <p className="text-xs line-clamp-2 text-slate-600 leading-relaxed">
                  {event.marketing_insights.commercial_trigger}
                </p>
              </div>

              {/* Actionable Marketing Ideas Snippets */}
              <div className="space-y-1.5 mb-4">
                {event.marketing_insights.suggested_campaign_angle.slice(0, 2).map((angle, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium"
                  >
                    <span className="text-brand-500 font-bold shrink-0">✓</span>
                    <span className="line-clamp-1">{angle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Footer: Product Tags & Action */}
            <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 mt-auto">
              <div className="flex items-center gap-1 overflow-hidden">
                {event.marketing_insights.relevant_industries.slice(0, 2).map((ind) => (
                  <span
                    key={ind}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-600 truncate"
                  >
                    {ind}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                <span>Detail Ide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
