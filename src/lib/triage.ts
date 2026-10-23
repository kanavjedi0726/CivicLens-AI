import type { CivicReport, GeminiAnalysis, Category, Urgency, ReportStatus, DashboardStats } from './types';

export const VALID_CATEGORIES: Category[] = [
  'pothole',
  'garbage',
  'water_leak',
  'streetlight',
  'road_safety',
  'vandalism',
  'flooding',
  'noise',
  'other',
];

export const VALID_URGENCIES: Urgency[] = ['low', 'medium', 'high', 'critical'];

export const VALID_STATUSES: ReportStatus[] = ['new', 'acknowledged', 'in_progress', 'resolved'];

/**
 * Validates report input fields.
 * Returns an object indicating validity and normalized values or error message.
 */
export function validateReportInput(
  description: unknown,
  location?: unknown
): {
  valid: boolean;
  error?: string;
  trimmedDesc?: string;
  trimmedLocation?: string | null;
} {
  if (typeof description !== 'string' || !description) {
    return {
      valid: false,
      error: 'Please provide a description of at least 10 characters.',
    };
  }

  const trimmedDesc = description.trim();
  if (trimmedDesc.length < 10) {
    return {
      valid: false,
      error: 'Please provide a description of at least 10 characters.',
    };
  }

  let trimmedLocation: string | null = null;
  if (typeof location === 'string') {
    const l = location.trim();
    trimmedLocation = l.length > 0 ? l : null;
  }

  return {
    valid: true,
    trimmedDesc,
    trimmedLocation,
  };
}

/**
 * Classifies an error encountered while contacting or executing Gemini AI.
 * Returns a human-friendly error message for civic operators.
 */
export function classifyGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes('GEMINI_API_KEY is not set')) {
    return 'API key not configured. Please add GEMINI_API_KEY to your .env file.';
  }
  if (message.toLowerCase().includes('quota') || message.includes('429')) {
    return 'Gemini API quota exceeded. Report saved without AI analysis — try again later.';
  }
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return 'Network error reaching Gemini API. Report saved without AI analysis.';
  }
  return `AI analysis failed: ${message}`;
}

/**
 * Validates and normalizes parsed Gemini analysis output.
 * Throws an error if required fields are missing or invalid.
 */
export function validateGeminiAnalysis(
  data: unknown,
  fallbackLocation?: string | null
): GeminiAnalysis {
  if (!data || typeof data !== 'object') {
    throw new Error('Gemini response is not a valid object.');
  }

  const record = data as Record<string, unknown>;

  const requiredFields: (keyof GeminiAnalysis)[] = [
    'category',
    'title',
    'summary',
    'urgency',
    'suggestedDepartment',
    'recommendedAction',
    'keyEvidence',
  ];

  for (const field of requiredFields) {
    if (record[field] === undefined || record[field] === null) {
      throw new Error(`Gemini response missing required field: "${field}"`);
    }
  }

  if (typeof record.title !== 'string' || record.title.trim().length === 0) {
    throw new Error('Gemini response title must be a non-empty string.');
  }

  if (typeof record.summary !== 'string' || record.summary.trim().length === 0) {
    throw new Error('Gemini response summary must be a non-empty string.');
  }

  if (!VALID_CATEGORIES.includes(record.category as Category)) {
    throw new Error(`Invalid category "${String(record.category)}" returned by Gemini.`);
  }

  if (!VALID_URGENCIES.includes(record.urgency as Urgency)) {
    throw new Error(`Invalid urgency "${String(record.urgency)}" returned by Gemini.`);
  }

  if (!Array.isArray(record.keyEvidence)) {
    throw new Error('Gemini response keyEvidence must be an array.');
  }

  const extractedLocation =
    typeof record.extractedLocation === 'string' && record.extractedLocation.trim().length > 0
      ? record.extractedLocation.trim()
      : (fallbackLocation ?? null);

  return {
    category: record.category as Category,
    title: record.title.trim(),
    summary: record.summary.trim(),
    urgency: record.urgency as Urgency,
    suggestedDepartment: String(record.suggestedDepartment).trim(),
    recommendedAction: String(record.recommendedAction).trim(),
    extractedLocation,
    keyEvidence: record.keyEvidence.map((e) => String(e).trim()).filter(Boolean),
  };
}

/**
 * Priority rank order for urgency levels (lower number = higher priority).
 */
export function urgencyOrder(u: Urgency): number {
  switch (u) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
    default:
      return 99;
  }
}

/**
 * Filter and sort incident reports according to query, filters, and priority ranking.
 */
export function filterAndSortReports(
  reports: CivicReport[],
  filters: {
    query?: string;
    category?: Category | '';
    urgency?: Urgency | '';
    status?: ReportStatus | '';
  }
): CivicReport[] {
  const q = (filters.query || '').trim().toLowerCase();

  const filtered = reports.filter((r) => {
    const matchesSearch =
      !q ||
      r.rawDescription.toLowerCase().includes(q) ||
      (r.analysis?.title && r.analysis.title.toLowerCase().includes(q)) ||
      (r.analysis?.summary && r.analysis.summary.toLowerCase().includes(q)) ||
      (r.analysis?.suggestedDepartment &&
        r.analysis.suggestedDepartment.toLowerCase().includes(q)) ||
      (r.analysis?.extractedLocation &&
        r.analysis.extractedLocation.toLowerCase().includes(q)) ||
      (r.location && r.location.toLowerCase().includes(q));

    const matchesCategory = !filters.category || r.analysis?.category === filters.category;
    const matchesUrgency = !filters.urgency || r.analysis?.urgency === filters.urgency;
    const matchesStatus = !filters.status || r.status === filters.status;

    return Boolean(matchesSearch && matchesCategory && matchesUrgency && matchesStatus);
  });

  return filtered.sort((a, b) => {
    const ua = a.analysis ? urgencyOrder(a.analysis.urgency) : 5;
    const ub = b.analysis ? urgencyOrder(b.analysis.urgency) : 5;
    if (ua !== ub) return ua - ub;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Computes dashboard statistics from current reports list.
 */
export function calculateDashboardStats(reports: CivicReport[]): DashboardStats {
  return {
    total: reports.length,
    unresolved: reports.filter((r) => r.status !== 'resolved').length,
    highPriority: reports.filter(
      (r) => r.analysis?.urgency === 'high' || r.analysis?.urgency === 'critical'
    ).length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };
}
