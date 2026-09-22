import { MarketingEvent } from '../types/calendar';

export function getGoogleCalendarUrl(event: MarketingEvent): string {
  // Format dates to YYYYMMDD for Google Calendar
  const cleanStartDate = event.timing.start_date.replace(/-/g, '');
  // For all day event end date, Google calendar treats end date as exclusive, so add 1 day or use same day
  const endObj = new Date(event.timing.end_date);
  endObj.setDate(endObj.getDate() + 1);
  const y = endObj.getFullYear();
  const m = String(endObj.getMonth() + 1).padStart(2, '0');
  const d = String(endObj.getDate()).padStart(2, '0');
  const cleanEndDate = `${y}${m}${d}`;

  const title = encodeURIComponent(`[Marketing Momen] ${event.title}`);
  const details = encodeURIComponent(
    `${event.subtitle}\n\n` +
    `Deskripsi: ${event.description}\n\n` +
    `Target Audiens: ${event.target_personas.join(', ')} (${event.education_level.join(', ')})\n` +
    `Ide Promo: \n- ${event.marketing_insights.suggested_campaign_angle.join('\n- ')}\n\n` +
    `Copywriting Hook:\n"${event.marketing_insights.sample_copywriting}"`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${cleanStartDate}/${cleanEndDate}&details=${details}`;
}

export function formatEventAsBrief(event: MarketingEvent): string {
  return `📢 MARKETING BRIEF: ${event.title.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Periode: ${event.timing.start_date} s.d. ${event.timing.end_date}
🎯 Target Jenjang: ${event.education_level.join(', ')}
👥 Target Persona: ${event.target_personas.join(', ')} (Pengambil Keputusan: ${event.primary_audience})
🛍️ Industri Terkait: ${event.marketing_insights.relevant_industries.join(', ')}

💡 TRIGGER PEMASARAN:
${event.marketing_insights.commercial_trigger}

⚖️ PAYER VS CONSUMER:
${event.marketing_insights.payer_vs_consumer}

🎯 IDE ANGLE KAMPANYE:
${event.marketing_insights.suggested_campaign_angle.map(angle => `• ${angle}`).join('\n')}

✍️ CONTOH COPYWRITING:
"${event.marketing_insights.sample_copywriting}"

📱 REKOMENDASI SALURAN:
${event.marketing_insights.recommended_channels.join(' | ')}
`;
}
