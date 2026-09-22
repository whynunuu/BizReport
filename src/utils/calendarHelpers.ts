import { MarketingEvent, CalendarFilters } from '../types/calendar';

export function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = getDaysInMonth(year, month);
  
  // Starting day of week: 0 = Sunday, 1 = Monday ...
  // In Indonesia, Monday (1) is typically first day of week or Sunday (0)
  // Let's use Monday (1) as start of week: Monday (0) to Sunday (6)
  let startDay = firstDay.getDay(); // 0 is Sun, 1 is Mon...
  // Convert to Mon=0 ... Sun=6
  const adjustedStart = (startDay + 6) % 7;

  const matrix: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Pad beginning with nulls
  for (let i = 0; i < adjustedStart; i++) {
    currentWeek.push(null);
  }

  daysInMonth.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  });

  // Pad ending with nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    matrix.push(currentWeek);
  }

  return matrix;
}

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isEventOnDate(event: MarketingEvent, date: Date): boolean {
  const dateStr = formatDateToISO(date);
  return dateStr >= event.timing.start_date && dateStr <= event.timing.end_date;
}

export function calculateCountdown(startDateStr: string, baseDate: Date = new Date()): { days: number; isPassed: boolean; isOngoing: boolean; endDateStr: string } {
  const targetStart = new Date(startDateStr);
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffTime = targetStart.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    days: Math.abs(diffDays),
    isPassed: diffDays < 0,
    isOngoing: diffDays === 0,
    endDateStr: startDateStr
  };
}

export function isLeadTimeActive(event: MarketingEvent, baseDate: Date = new Date()): boolean {
  const targetStart = new Date(event.timing.start_date);
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffDays = Math.ceil((targetStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= event.timing.campaign_lead_days;
}

export function filterEvents(events: MarketingEvent[], filters: CalendarFilters): MarketingEvent[] {
  return events.filter(event => {
    // 1. Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = event.title.toLowerCase().includes(q);
      const matchSub = event.subtitle.toLowerCase().includes(q);
      const matchDesc = event.description.toLowerCase().includes(q);
      const matchIndustry = event.marketing_insights.relevant_industries.some(ind => ind.toLowerCase().includes(q));
      const matchTags = event.marketing_insights.suggested_campaign_angle.some(ang => ang.toLowerCase().includes(q));
      if (!matchTitle && !matchSub && !matchDesc && !matchIndustry && !matchTags) {
        return false;
      }
    }

    // 2. Education Level
    if (filters.selectedEducation.length > 0) {
      const matchEdu = event.education_level.some(lvl => 
        filters.selectedEducation.includes(lvl) || lvl === 'ALL'
      );
      if (!matchEdu) return false;
    }

    // 3. Target Persona
    if (filters.selectedPersonas.length > 0) {
      const matchPersona = event.target_personas.some(p => filters.selectedPersonas.includes(p));
      if (!matchPersona) return false;
    }

    // 4. Industry
    if (filters.selectedIndustries.length > 0) {
      const matchInd = event.marketing_insights.relevant_industries.some(i => filters.selectedIndustries.includes(i));
      if (!matchInd) return false;
    }

    // 5. Category filter
    if (filters.selectedCategory && filters.selectedCategory !== 'all') {
      if (event.category !== filters.selectedCategory) return false;
    }

    return true;
  });
}
