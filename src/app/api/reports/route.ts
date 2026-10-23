import type { NextRequest } from 'next/server';
import { analyseReport } from '@/lib/gemini';
import { findDuplicates } from '@/lib/duplicates';
import { validateReportInput, classifyGeminiError } from '@/lib/triage';
import type { CivicReport } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { description: string; location?: string; existingReports?: CivicReport[] };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { description, location, existingReports = [] } = body;

  const validation = validateReportInput(description, location);
  if (!validation.valid || !validation.trimmedDesc) {
    return Response.json(
      { error: validation.error ?? 'Please provide a description of at least 10 characters.' },
      { status: 400 }
    );
  }

  const trimmedDesc = validation.trimmedDesc;
  const trimmedLocation = validation.trimmedLocation ?? null;

  const now = new Date().toISOString();
  const id = uuidv4();

  // Attempt Gemini analysis
  let analysis = null;
  let analysisError: string | null = null;

  try {
    analysis = await analyseReport(trimmedDesc, trimmedLocation);
  } catch (err: unknown) {
    analysisError = classifyGeminiError(err);
  }

  const newReport: CivicReport = {
    id,
    rawDescription: trimmedDesc,
    location: trimmedLocation,
    analysis,
    analysisError,
    status: 'new',
    isDemo: false,
    isUnanalysed: analysis === null,
    createdAt: now,
    updatedAt: now,
    duplicateSuggestions: [],
  };

  // Best-effort duplicate detection
  try {
    const duplicates = findDuplicates(
      { rawDescription: trimmedDesc, analysis },
      existingReports
    );
    newReport.duplicateSuggestions = duplicates;
  } catch {
    // Non-fatal — ignore
  }

  return Response.json({ report: newReport }, { status: 201 });
}
