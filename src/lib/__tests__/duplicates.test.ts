import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates } from '../duplicates';
import type { CivicReport, GeminiAnalysis } from '../types';

describe('Duplicate Detection Engine (findDuplicates)', () => {
  const baseAnalysis: GeminiAnalysis = {
    category: 'pothole',
    title: 'Severe Pothole on Oak Ave',
    summary: 'A deep pothole is damaging vehicles.',
    urgency: 'high',
    suggestedDepartment: 'Public Works',
    recommendedAction: 'Fill pothole',
    extractedLocation: 'Oak Avenue & Main St',
    keyEvidence: ['deep pothole', 'vehicle damage'],
  };

  const sampleReport: CivicReport = {
    id: 'rep-existing-1',
    rawDescription: 'There is a massive dangerous pothole on Oak Avenue near Main Street.',
    location: 'Oak Avenue',
    analysis: baseAnalysis,
    analysisError: null,
    status: 'new',
    isDemo: false,
    isUnanalysed: false,
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    duplicateSuggestions: [],
  };

  it('returns empty array when existing reports list is empty', () => {
    const duplicates = findDuplicates(
      {
        rawDescription: 'There is a massive dangerous pothole on Oak Avenue near Main Street.',
        analysis: baseAnalysis,
      },
      []
    );
    assert.deepEqual(duplicates, []);
  });

  it('detects a clear duplicate with identical wording and category', () => {
    const duplicates = findDuplicates(
      {
        rawDescription: 'There is a massive dangerous pothole on Oak Avenue near Main Street.',
        analysis: baseAnalysis,
      },
      [sampleReport]
    );
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0], 'rep-existing-1');
  });

  it('detects duplicate when descriptions share high word overlap and location', () => {
    const duplicates = findDuplicates(
      {
        rawDescription: 'Deep dangerous pothole on Oak Avenue near Main Street damaging cars.',
        analysis: {
          ...baseAnalysis,
          title: 'Deep pothole on Oak',
        },
      },
      [sampleReport]
    );
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0], 'rep-existing-1');
  });

  it('does not flag completely unrelated reports as duplicates', () => {
    const duplicates = findDuplicates(
      {
        rawDescription: 'Streetlight is flickering continuously in front of 44 Pine Road at night.',
        analysis: {
          ...baseAnalysis,
          category: 'streetlight',
          extractedLocation: '44 Pine Road',
        },
      },
      [sampleReport]
    );
    assert.deepEqual(duplicates, []);
  });

  it('handles null analysis without throwing an error', () => {
    const duplicates = findDuplicates(
      {
        rawDescription: 'Completely different report without AI analysis yet.',
        analysis: null,
      },
      [sampleReport]
    );
    assert.deepEqual(duplicates, []);
  });
});
