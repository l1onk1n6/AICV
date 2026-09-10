export interface PersonalInfo {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  street: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
  photo?: string; // base64
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  grade: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  category: string;
}

export interface Language {
  id: string;
  name: string;
  level: 'Grundkenntnisse' | 'Fortgeschritten' | 'Fließend' | 'Muttersprache';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  technologies: string[];
  startDate: string;
  endDate: string;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  category: 'certificate' | 'reference' | 'portfolio' | 'other';
  /** User-definierte Reihenfolge (0-basiert). Fallback: uploadedAt. */
  orderIndex?: number;
}

export interface CustomSection {
  id: string;
  title: string;
  items: string[];
}

export type TemplateId =
  | 'minimal'
  | 'executive'
  | 'creative'
  | 'nordic'
  | 'corporate'
  | 'tech'
  | 'elegant'
  | 'bold'
  | 'academic'
  | 'startup'
  | 'modern'
  | 'vibrant'
  | 'vintage'
  | 'magazine'
  | 'timeline'
  | 'compact'
  | 'pastel'
  | 'geometric'
  | 'freelancer'
  | 'international';

export interface Resume {
  id: string;
  personId: string;
  name: string;
  status: ApplicationStatus;
  jobUrl: string;
  deadline: string;
  templateId: TemplateId;
  accentColor: string;
  personalInfo: PersonalInfo;
  coverLetter: CoverLetter;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  projects: Project[];
  certificates: Certificate[];
  documents: UploadedDocument[];
  customSections: CustomSection[];
  shareToken?: string;
  shareViews?: number;
  lastViewedAt?: string;
  reminderDays?: number[];   // e.g. [1, 3, 7] — days before deadline to send reminder
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  avatar?: string; // base64
  resumeIds: string[];
  activeResumeId: string;
  createdAt: string;
}

export type ApplicationStatus = 'entwurf' | 'gesendet' | 'interview' | 'abgelehnt' | 'angenommen';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  entwurf:    'Entwurf',
  gesendet:   'Gesendet',
  interview:  'Interview',
  abgelehnt:  'Abgelehnt',
  angenommen: 'Angenommen',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  entwurf:    'var(--text-4)',
  gesendet:   'var(--ios-blue)',
  interview:  'var(--ios-amber)',
  abgelehnt:  'var(--ios-red)',
  angenommen: 'var(--ios-green)',
};

export interface CoverLetter {
  recipient: string;
  subject: string;
  body: string;
  closing: string;
}

export type EditorSection =
  | 'personal'
  | 'cover-letter'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certificates'
  | 'documents'
  | 'custom'
  | 'template'
  | 'translate'
  | 'history';
