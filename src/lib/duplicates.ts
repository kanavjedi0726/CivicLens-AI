import type { CivicReport, GeminiAnalysis } from './types';

/**
 * Compute a simple text similarity score between two strings.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function tokenSimilarity(a: string, b: string): number {
  const tokenise = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const setA = tokenise(a);
  const setB = tokenise(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  return intersection / Math.max(setA.size, setB.size);
}

/**
 * Given a new report and a list of existing reports, return IDs of
 * reports that are likely duplicates (similarity > 0.35).
 */
export function findDuplicates(
  newReport: { rawDescription: string; analysis: GeminiAnalysis | null },
  existing: CivicReport[]
): string[] {
  const THRESHOLD = 0.35;
  const candidates: string[] = [];

  for (const r of existing) {
    // Compare raw descriptions
    const descScore = tokenSimilarity(newReport.rawDescription, r.rawDescription);

    // Bonus if Gemini picked the same category
    const categoryBonus =
      newReport.analysis && r.analysis && newReport.analysis.category === r.analysis?.category
        ? 0.15
        : 0;

    // Compare extracted locations if both exist
    let locationBonus = 0;
    if (newReport.analysis?.extractedLocation && r.analysis?.extractedLocation) {
      locationBonus =
        tokenSimilarity(newReport.analysis.extractedLocation, r.analysis.extractedLocation) * 0.1;
    }

    if (descScore + categoryBonus + locationBonus >= THRESHOLD) {
      candidates.push(r.id);
    }
  }

  return candidates;
}
