import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReportInput,
  classifyGeminiError,
  validateGeminiAnalysis,
  urgencyOrder,
  filterAndSortReports,
  calculateDashboardStats,
  VALID_CATEGORIES,
  VALID_URGENCIES,
} from '../triage';
import type { CivicReport } from '../types';

describe('Triage Logic: Constants Integrity', () => {
  it('exposes expected valid civic categories and urgencies', () => {
    assert.equal(VALID_CATEGORIES.length, 9);
    assert.ok(VALID_CATEGORIES.includes('pothole'));
    assert.ok(VALID_CATEGORIES.includes('water_leak'));
    assert.equal(VALID_URGENCIES.length, 4);
    assert.ok(VALID_URGENCIES.includes('critical'));
  });
});

describe('Triage Logic: validateReportInput', () => {
  it('rejects null or non-string descriptions', () => {
    assert.equal(validateReportInput(null).valid, false);
    assert.equal(validateReportInput(undefined).valid, false);
    assert.equal(validateReportInput(12345).valid, false);
    assert.equal(validateReportInput({}).valid, false);
  });

  it('rejects empty strings or strings with only whitespace', () => {
    const res = validateReportInput('   \n  \t  ');
    assert.equal(res.valid, false);
    assert.match(res.error || '', /at least 10 characters/i);
  });

  it('rejects descriptions shorter than 10 characters', () => {
    const res = validateReportInput('Pothole!');
    assert.equal(res.valid, false);
    assert.match(res.error || '', /at least 10 characters/i);
  });

  it('accepts valid descriptions and trims whitespace', () => {
    const res = validateReportInput('   Major water main break on Elm Street flooding houses.   ');
    assert.equal(res.valid, true);
    assert.equal(res.trimmedDesc, 'Major water main break on Elm Street flooding houses.');
  });

  it('normalizes optional location: trims non-empty string and converts empty to null', () => {
    const resWithLoc = validateReportInput('Dangerous pothole near the highway entrance.', '  Corner of 5th & Elm  ');
    assert.equal(resWithLoc.trimmedLocation, 'Corner of 5th & Elm');

    const resEmptyLoc = validateReportInput('Dangerous pothole near the highway entrance.', '   ');
    assert.equal(resEmptyLoc.trimmedLocation, null);

    const resNoLoc = validateReportInput('Dangerous pothole near the highway entrance.');
    assert.equal(resNoLoc.trimmedLocation, null);
  });
});

describe('Triage Logic: classifyGeminiError', () => {
  it('identifies missing API key error', () => {
    const err = new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
    const msg = classifyGeminiError(err);
    assert.match(msg, /API key not configured/i);
  });

  it('identifies quota exhaustion and 429 errors', () => {
    const err = new Error('429 Resource has been exhausted (e.g. check quota).');
    const msg = classifyGeminiError(err);
    assert.match(msg, /quota exceeded/i);
  });

  it('identifies network and fetch failures', () => {
    const err = new Error('fetch failed: Network timeout contacting generative language API');
    const msg = classifyGeminiError(err);
    assert.match(msg, /network error/i);
  });

  it('handles general errors gracefully', () => {
    const err = new Error('Unexpected internal parsing failure');
    const msg = classifyGeminiError(err);
    assert.match(msg, /AI analysis failed/i);
  });

  it('handles non-Error objects gracefully', () => {
    const msg = classifyGeminiError('Random string exception');
    assert.match(msg, /AI analysis failed: Random string exception/i);
  });
});

describe('Triage Logic: validateGeminiAnalysis', () => {
  const validPayload = {
    category: 'water_leak',
    title: 'Burst Water Pipe on King St',
    summary: 'A continuous stream of water is escaping onto the road.',
    urgency: 'critical',
    suggestedDepartment: 'Water & Utilities',
    recommendedAction: 'Isolate main valve within 2 hours.',
    extractedLocation: 'King Street near Market',
    keyEvidence: ['heavy water flow', 'traffic disruption'],
  };

  it('accepts and normalizes a valid Gemini payload', () => {
    const res = validateGeminiAnalysis(validPayload, 'Fallback Location');
    assert.equal(res.category, 'water_leak');
    assert.equal(res.urgency, 'critical');
    assert.equal(res.title, 'Burst Water Pipe on King St');
    assert.equal(res.extractedLocation, 'King Street near Market');
    assert.deepEqual(res.keyEvidence, ['heavy water flow', 'traffic disruption']);
  });

  it('uses fallback location when extractedLocation is null or omitted', () => {
    const payloadWithoutLoc = { ...validPayload, extractedLocation: null };
    const res = validateGeminiAnalysis(payloadWithoutLoc, 'User Supplied Corner');
    assert.equal(res.extractedLocation, 'User Supplied Corner');
  });

  it('throws an error if payload is null or not an object', () => {
    assert.throws(() => validateGeminiAnalysis(null), /valid object/i);
    assert.throws(() => validateGeminiAnalysis('not-an-object'), /valid object/i);
  });

  it('throws an error if any required field is missing', () => {
    const missingTitle = { ...validPayload };
    delete (missingTitle as Record<string, unknown>).title;
    assert.throws(() => validateGeminiAnalysis(missingTitle), /missing required field: "title"/i);

    const missingCategory = { ...validPayload };
    delete (missingCategory as Record<string, unknown>).category;
    assert.throws(() => validateGeminiAnalysis(missingCategory), /missing required field: "category"/i);
  });

  it('throws an error if category is not in the recognized categories list', () => {
    const invalidCat = { ...validPayload, category: 'alien_invasion' };
    assert.throws(() => validateGeminiAnalysis(invalidCat), /invalid category/i);
  });

  it('throws an error if urgency is not in the recognized urgency list', () => {
    const invalidUrg = { ...validPayload, urgency: 'apocalyptic' };
    assert.throws(() => validateGeminiAnalysis(invalidUrg), /invalid urgency/i);
  });

  it('throws an error if keyEvidence is not an array', () => {
    const badEvidence = { ...validPayload, keyEvidence: 'not-an-array' };
    assert.throws(() => validateGeminiAnalysis(badEvidence), /keyEvidence must be an array/i);
  });
});

describe('Triage Logic: urgencyOrder & Priority Sorting', () => {
  it('correctly ranks critical as 0, high as 1, medium as 2, low as 3', () => {
    assert.equal(urgencyOrder('critical'), 0);
    assert.equal(urgencyOrder('high'), 1);
    assert.equal(urgencyOrder('medium'), 2);
    assert.equal(urgencyOrder('low'), 3);
  });

  it('sorts critical reports before high and low priority reports', () => {
    const reports: CivicReport[] = [
      {
        id: '1',
        rawDescription: 'Low priority cosmetic graffiti on a wall.',
        location: null,
        analysis: {
          category: 'vandalism',
          title: 'Graffiti on wall',
          summary: 'Graffiti tag on concrete.',
          urgency: 'low',
          suggestedDepartment: 'Sanitation',
          recommendedAction: 'Clean within 14 days',
          extractedLocation: null,
          keyEvidence: ['graffiti tag'],
        },
        analysisError: null,
        status: 'new',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-21T08:00:00Z',
        updatedAt: '2026-10-21T08:00:00Z',
        duplicateSuggestions: [],
      },
      {
        id: '2',
        rawDescription: 'Critical live electrical wire sparking across a puddle.',
        location: null,
        analysis: {
          category: 'road_safety',
          title: 'Live sparking wire',
          summary: 'Downed electrical line.',
          urgency: 'critical',
          suggestedDepartment: 'Emergency Electrical',
          recommendedAction: 'Dispatch emergency team immediately',
          extractedLocation: null,
          keyEvidence: ['sparking wire', 'puddle'],
        },
        analysisError: null,
        status: 'new',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-21T09:00:00Z',
        updatedAt: '2026-10-21T09:00:00Z',
        duplicateSuggestions: [],
      },
    ];

    const sorted = filterAndSortReports(reports, {});
    assert.equal(sorted[0].id, '2'); // Critical comes first
    assert.equal(sorted[1].id, '1');
  });

  it('filters reports accurately by category and status', () => {
    const reports: CivicReport[] = [
      {
        id: 'rep-water',
        rawDescription: 'Burst water pipe leaking everywhere on 2nd Ave.',
        location: null,
        analysis: {
          category: 'water_leak',
          title: 'Burst pipe',
          summary: 'Leak on 2nd Ave',
          urgency: 'high',
          suggestedDepartment: 'Water',
          recommendedAction: 'Fix pipe',
          extractedLocation: '2nd Ave',
          keyEvidence: ['leak'],
        },
        analysisError: null,
        status: 'in_progress',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
        duplicateSuggestions: [],
      },
      {
        id: 'rep-garbage',
        rawDescription: 'Overflowing bins outside apartment block.',
        location: null,
        analysis: {
          category: 'garbage',
          title: 'Overflowing bins',
          summary: 'Piled trash',
          urgency: 'medium',
          suggestedDepartment: 'Waste',
          recommendedAction: 'Collect garbage',
          extractedLocation: null,
          keyEvidence: ['overflowing bins'],
        },
        analysisError: null,
        status: 'resolved',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-21T11:00:00Z',
        updatedAt: '2026-10-21T11:00:00Z',
        duplicateSuggestions: [],
      },
    ];

    const waterOnly = filterAndSortReports(reports, { category: 'water_leak' });
    assert.equal(waterOnly.length, 1);
    assert.equal(waterOnly[0].id, 'rep-water');

    const resolvedOnly = filterAndSortReports(reports, { status: 'resolved' });
    assert.equal(resolvedOnly.length, 1);
    assert.equal(resolvedOnly[0].id, 'rep-garbage');

    const searchResult = filterAndSortReports(reports, { query: 'apartment' });
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].id, 'rep-garbage');
  });
});

describe('Triage Logic: calculateDashboardStats', () => {
  it('computes metrics accurately across multiple reports', () => {
    const testReports: CivicReport[] = [
      {
        id: '1',
        rawDescription: 'Incident 1',
        location: null,
        analysis: {
          category: 'pothole',
          title: 'Pothole',
          summary: 'sum',
          urgency: 'critical',
          suggestedDepartment: 'Dept',
          recommendedAction: 'Act',
          extractedLocation: null,
          keyEvidence: [],
        },
        analysisError: null,
        status: 'new',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        duplicateSuggestions: [],
      },
      {
        id: '2',
        rawDescription: 'Incident 2',
        location: null,
        analysis: {
          category: 'garbage',
          title: 'Garbage',
          summary: 'sum',
          urgency: 'high',
          suggestedDepartment: 'Dept',
          recommendedAction: 'Act',
          extractedLocation: null,
          keyEvidence: [],
        },
        analysisError: null,
        status: 'acknowledged',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        duplicateSuggestions: [],
      },
      {
        id: '3',
        rawDescription: 'Incident 3',
        location: null,
        analysis: {
          category: 'streetlight',
          title: 'Light',
          summary: 'sum',
          urgency: 'low',
          suggestedDepartment: 'Dept',
          recommendedAction: 'Act',
          extractedLocation: null,
          keyEvidence: [],
        },
        analysisError: null,
        status: 'resolved',
        isDemo: false,
        isUnanalysed: false,
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
        duplicateSuggestions: [],
      },
    ];

    const stats = calculateDashboardStats(testReports);
    assert.equal(stats.total, 3);
    assert.equal(stats.unresolved, 2); // 'new' and 'acknowledged'
    assert.equal(stats.highPriority, 2); // 'critical' and 'high'
    assert.equal(stats.resolved, 1);
  });
});
