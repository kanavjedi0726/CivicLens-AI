import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../route';
import type { NextRequest } from 'next/server';

function createMockRequest(bodyContent: unknown, isRawText = false): NextRequest {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };

  if (isRawText) {
    init.body = String(bodyContent);
  } else if (bodyContent !== undefined) {
    init.body = JSON.stringify(bodyContent);
  }

  return new Request('http://localhost:3000/api/reports', init) as unknown as NextRequest;
}

describe('API Route: POST /api/reports', () => {
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    // Ensure no real API key is ever accessed during test runs
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalEnvKey) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('returns 400 when request body contains invalid JSON', async () => {
    const req = createMockRequest('{ invalid json', true);
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.error, 'Invalid JSON body.');
  });

  it('returns 400 when description is missing from the payload', async () => {
    const req = createMockRequest({ location: 'Main Street' });
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.match(data.error, /at least 10 characters/i);
  });

  it('returns 400 when description is shorter than 10 characters', async () => {
    const req = createMockRequest({ description: 'Pothole!' });
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.match(data.error, /at least 10 characters/i);
  });

  it('handles missing API key gracefully without crashing, saving an unanalysed report', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = createMockRequest({
      description: 'Massive burst pipe on Elm Street causing severe flooding.',
      location: 'Elm Street, near park',
    });

    const res = await POST(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.ok(data.report);
    assert.equal(data.report.rawDescription, 'Massive burst pipe on Elm Street causing severe flooding.');
    assert.equal(data.report.location, 'Elm Street, near park');
    assert.equal(data.report.analysis, null);
    assert.equal(data.report.isUnanalysed, true);
    assert.match(data.report.analysisError, /API key not configured/i);
  });

  it('executes duplicate detection against existingReports in the payload', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = createMockRequest({
      description: 'Dangerous pothole on Victoria Road near the petrol station.',
      existingReports: [
        {
          id: 'existing-dup-99',
          rawDescription: 'Dangerous pothole on Victoria Road near the petrol station.',
          location: 'Victoria Road',
          analysis: null,
          analysisError: null,
          status: 'new',
          isDemo: false,
          isUnanalysed: true,
          createdAt: '2026-10-22T10:00:00Z',
          updatedAt: '2026-10-22T10:00:00Z',
          duplicateSuggestions: [],
        },
      ],
    });

    const res = await POST(req);
    assert.equal(res.status, 201);

    const data = await res.json();
    assert.ok(data.report);
    assert.ok(Array.isArray(data.report.duplicateSuggestions));
    assert.equal(data.report.duplicateSuggestions.length, 1);
    assert.equal(data.report.duplicateSuggestions[0], 'existing-dup-99');
  });
});
