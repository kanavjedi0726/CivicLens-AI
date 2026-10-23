import { GoogleGenAI } from '@google/genai';
import type { GeminiAnalysis } from './types';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
  }
  return new GoogleGenAI({ apiKey: key });
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['pothole', 'garbage', 'water_leak', 'streetlight', 'road_safety', 'vandalism', 'flooding', 'noise', 'other'],
      description: 'Best-fit civic issue category.',
    },
    title: {
      type: 'string',
      description: 'A concise, action-oriented title (max 80 characters).',
    },
    summary: {
      type: 'string',
      description: 'A clear two-to-three sentence summary of the issue for a municipal officer.',
    },
    urgency: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Urgency level: low=cosmetic, medium=inconvenient, high=safety risk, critical=immediate danger or major health risk.',
    },
    suggestedDepartment: {
      type: 'string',
      description: 'Name of the most appropriate municipal department to handle this.',
    },
    recommendedAction: {
      type: 'string',
      description: 'Specific next action the department should take, including any time targets.',
    },
    extractedLocation: {
      type: 'string',
      description: 'Location extracted from the description, or null if none mentioned.',
      nullable: true,
    },
    keyEvidence: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of key facts or details extracted from the description that support the analysis.',
    },
  },
  required: ['category', 'title', 'summary', 'urgency', 'suggestedDepartment', 'recommendedAction', 'keyEvidence'],
};

export async function analyseReport(
  description: string,
  userLocation: string | null
): Promise<GeminiAnalysis> {
  const client = getClient();

  const locationHint = userLocation
    ? `\nUser-provided location: "${userLocation}"`
    : '';

  const prompt = `You are a civic operations AI assistant. Analyse the following civic issue report and return structured information to help a municipal officer triage and route it correctly.

Report:
"""
${description}
"""${locationHint}

Return ONLY valid JSON matching the provided schema. Do not include any explanation or markdown.`;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  let parsed: GeminiAnalysis;
  try {
    parsed = JSON.parse(text) as GeminiAnalysis;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }

  // Validate required fields
  const required: (keyof GeminiAnalysis)[] = [
    'category', 'title', 'summary', 'urgency',
    'suggestedDepartment', 'recommendedAction', 'keyEvidence',
  ];
  for (const field of required) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Gemini response missing required field: "${field}"`);
    }
  }

  // Normalise optional nullable field
  if (!parsed.extractedLocation) parsed.extractedLocation = userLocation;

  return parsed;
}
