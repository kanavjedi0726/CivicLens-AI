export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved';
export type Category =
  | 'pothole'
  | 'garbage'
  | 'water_leak'
  | 'streetlight'
  | 'road_safety'
  | 'vandalism'
  | 'flooding'
  | 'noise'
  | 'other';

export interface GeminiAnalysis {
  category: Category;
  title: string;
  summary: string;
  urgency: Urgency;
  suggestedDepartment: string;
  recommendedAction: string;
  extractedLocation: string | null;
  keyEvidence: string[];
}

export interface CivicReport {
  id: string;
  rawDescription: string;
  location: string | null;
  analysis: GeminiAnalysis | null;
  analysisError: string | null;
  status: ReportStatus;
  isDemo: boolean;
  isUnanalysed: boolean;
  createdAt: string; // ISO string for JSON serialisation
  updatedAt: string;
  duplicateSuggestions: string[]; // IDs of potentially similar reports
}

export interface DashboardStats {
  total: number;
  unresolved: number;
  highPriority: number;
  resolved: number;
}
