import type { NextRequest } from 'next/server';
import { analyseReport } from '@/lib/gemini';
import { findDuplicates } from '@/lib/duplicates';
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

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return Response.json(
      { error: 'Please provide a description of at least 10 characters.' },
      { status: 400 }
    );
  }

  const trimmedDesc = description.trim();
  const trimmedLocation = location?.trim() || null;

  const now = new Date().toISOString();
  const id = uuidv4();

  // Attempt Gemini analysis
  let analysis = null;
  let analysisError: string | null = null;

  try {
    analysis = await analyseReport(trimmedDesc, trimmedLocation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Classify error for user-facing messages
    if (message.includes('GEMINI_API_KEY is not set')) {
      analysisError = 'API key not configured. Please add GEMINI_API_KEY to your .env file.';
    } else if (message.toLowerCase().includes('quota') || message.includes('429')) {
      analysisError = 'Gemini API quota exceeded. Report saved without AI analysis — try again later.';
    } else if (message.toLowerCase().includes('network') || message.includes('fetch')) {
      analysisError = 'Network error reaching Gemini API. Report saved without AI analysis.';
    } else {
      analysisError = `AI analysis failed: ${message}`;
    }
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
