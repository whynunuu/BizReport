export type EducationLevel = 'SD' | 'SMP' | 'SMA' | 'KAMPUS' | 'ALL';

export type TargetPersona = 'Siswa' | 'Orang Tua' | 'Guru' | 'Keluarga';

export type EventCategory = 
  | 'back_to_school'
  | 'exam_period'
  | 'school_holiday'
  | 'national_day'
  | 'commercial_sale'
  | 'graduation_admissions';

export type IndustryCategory = 
  | 'ATK & Buku'
  | 'Fashion & Seragam'
  | 'F&B & Bekal Sehat'
  | 'Bimbel & EdTech'
  | 'Gadget & Elektronik'
  | 'Wisata & Hiburan';

export interface MarketingEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: EventCategory;
  education_level: EducationLevel[];
  primary_audience: TargetPersona;
  target_personas: TargetPersona[];
  timing: {
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
    is_exact_date: boolean;
    recurrence: 'yearly' | 'semester' | 'monthly';
    campaign_lead_days: number; // e.g. 30 days before event
  };
  marketing_insights: {
    commercial_trigger: string;
    payer_vs_consumer: string;
    relevant_industries: IndustryCategory[];
    suggested_campaign_angle: string[];
    recommended_channels: string[];
    sample_copywriting: string;
  };
  badge_color?: string;
}

export interface CalendarFilters {
  searchQuery: string;
  selectedEducation: EducationLevel[];
  selectedPersonas: TargetPersona[];
  selectedIndustries: IndustryCategory[];
  selectedCategory: string; // 'all' or EventCategory
  month: number; // 0-11
  year: number;
}
