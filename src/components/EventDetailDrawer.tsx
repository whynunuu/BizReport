import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  Users, 
  Megaphone, 
  ShoppingBag, 
  FileText 
} from 'lucide-react';
import { MarketingEvent } from '../types/calendar';
import { calculateCountdown, isLeadTimeActive } from '../utils/calendarHelpers';
import { getGoogleCalendarUrl, formatEventAsBrief } from '../utils/exportHelpers';

interface EventDetailDrawerProps {
  event: MarketingEvent | null;
  onClose: () => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({ event, onClose }) => {
  const [copiedType, setCopiedType] = useState<'copy' | 'brief' | null>(null);

  if (!event) return null;

  const countdown = calculateCountdown(event.timing.start_date);
  const inLeadTime = isLeadTimeActive(event);
  const googleCalUrl = getGoogleCalendarUrl(event);

  const handleCopyCopywriting = () => {
    navigator.clipboard.writeText(event.marketing_insights.sample_copywriting);
    setCopiedType('copy');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyBrief = () => {
    const briefText = formatEventAsBrief(event);
    navigator.clipboard.writeText(briefText);
    setCopiedType('brief');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
          
          {/* Top Bar */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                Detail Momen & Ide
              </span>
              <div className="flex items-center gap-1">
                {event.education_level.map((lvl) => (
                  <span key={lvl} className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {lvl}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scrollable */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
            
            {/* Title & Timing Header */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>{event.timing.start_date} s.d. {event.timing.end_date}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {event.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {event.subtitle}
              </p>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {event.description}
              </p>
            </div>

            {/* Countdown & Lead-Time Alert */}
            <div className={`p-4 rounded-2xl border ${
              inLeadTime 
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-300' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                    inLeadTime ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {countdown.isOngoing 
                        ? 'Sedang Berlangsung Hari Ini!' 
                        : countdown.isPassed 
                        ? 'Momen Sudah Berlalu' 
                        : `Kurang ${countdown.days} Hari Lagi`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Waktu persiapan promosi ideal: <strong>{event.timing.campaign_lead_days} hari</strong> sebelumnya
                    </div>
                  </div>
                </div>

                {inLeadTime && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                    Action Now
                  </span>
                )}
              </div>
            </div>

            {/* Payer vs Consumer Dynamics (Special for School Market) */}
            <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                <Users className="w-4 h-4 text-brand-600" />
                <span>Dinamika Konsumen vs Pembayar</span>
              </div>
              <p className="text-xs text-brand-950/80 leading-relaxed">
                {event.marketing_insights.payer_vs_consumer}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="font-semibold text-brand-800">Target Utama:</span>
                {event.target_personas.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-md bg-white text-brand-700 font-medium border border-brand-200">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Commercial Trigger */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                <span>Pemicu Pembelian (Buying Trigger)</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                {event.marketing_insights.commercial_trigger}
              </p>
            </div>

            {/* Campaign Angles */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-brand-600" />
                <span>Ide Angle Kampanye & Promosi</span>
              </h4>
              <div className="space-y-2">
                {event.marketing_insights.suggested_campaign_angle.map((angle, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{angle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready-to-use Copywriting Hook */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Contoh Copywriting Siap Pakai</span>
                </h4>
                <button
                  onClick={handleCopyCopywriting}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {copiedType === 'copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Hook</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed font-mono relative group">
                "{event.marketing_insights.sample_copywriting}"
              </div>
            </div>

            {/* Recommended Channels & Industries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Saluran Paling Efektif
                </div>
                <div className="space-y-1">
                  {event.marketing_insights.recommended_channels.map(ch => (
                    <div key={ch} className="text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      <span>{ch}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Industri Terkait
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {event.marketing_insights.relevant_industries.map(ind => (
                    <span key={ind} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <button
              onClick={handleCopyBrief}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              {copiedType === 'brief' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Brief Lengkap Tersalin!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Salin Brief Lengkap</span>
                </>
              )}
            </button>

            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-brand-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Simpan ke Google Cal</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
