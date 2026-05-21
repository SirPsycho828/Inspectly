// AI narrative generation using Claude API
// Based on docs/planning/10_AI_Narrative_Generation.md

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

const NARRATIVE_SYSTEM_PROMPT = `You are a professional home inspector documenting findings for a buyer's inspection report.

Rules:
- Write in factual, objective language. Avoid alarmist or minimizing tone.
- Do not diagnose root causes beyond what is visually observable.
- Do not estimate repair costs.
- Use industry-standard terminology.
- Match narrative length to severity: critical findings get 2-3 sentences, informational items get 1 sentence.
- Recommendation should name the appropriate specialist when relevant (plumber, electrician, structural engineer, roofer, HVAC technician).
- Never use first person. Use passive voice or refer to "the inspector".
- Include the word "recommend" in recommendations (industry convention for liability protection).
- Do not use the words "defective" or "dangerous" — use "deficient", "safety concern", or "requires attention".

Format your response exactly as:
NARRATIVE: [your narrative text]
RECOMMENDATION: [your recommendation text]`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new HttpsError('internal', 'Anthropic API key not configured');
  return new Anthropic({ apiKey });
}

function parseResponse(text: string, severity: string): { narrative: string; recommendation: string } {
  const narrativeMatch = text.match(/NARRATIVE:\s*([\s\S]*?)(?=RECOMMENDATION:|$)/i);
  const recommendationMatch = text.match(/RECOMMENDATION:\s*([\s\S]*?)$/i);

  if (narrativeMatch && recommendationMatch) {
    return {
      narrative: narrativeMatch[1].trim(),
      recommendation: recommendationMatch[1].trim(),
    };
  }

  // Fallback if parsing fails
  const defaultRecommendation =
    severity === 'critical' || severity === 'major'
      ? 'Recommend further evaluation by a qualified professional.'
      : severity === 'minor'
        ? 'Recommend repair or monitoring as part of routine maintenance.'
        : '';

  return {
    narrative: text.trim(),
    recommendation: defaultRecommendation,
  };
}

export const generateNarrative = onCall(
  { enforceAppCheck: false, secrets: ['ANTHROPIC_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { component, condition, severity, context } = request.data;
    if (!component || !condition || !severity) {
      throw new HttpsError('invalid-argument', 'Component, condition, and severity are required');
    }

    const client = getClient();

    const userMessage = `Component: ${component}
Condition: ${condition}
Severity: ${severity}
Inspector notes: ${context || 'None'}

Generate a professional inspection finding narrative and recommendation.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.3,
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseResponse(text, severity);
  }
);

export const generateExecutiveSummary = onCall(
  { enforceAppCheck: false, secrets: ['ANTHROPIC_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { inspectionId } = request.data;
    if (!inspectionId) {
      throw new HttpsError('invalid-argument', 'Inspection ID is required');
    }

    const db = admin.firestore();

    // Fetch inspection and findings
    const [inspectionSnap, findingsSnap] = await Promise.all([
      db.collection('inspections').doc(inspectionId).get(),
      db.collection('inspections').doc(inspectionId).collection('findings').get(),
    ]);

    if (!inspectionSnap.exists) {
      throw new HttpsError('not-found', 'Inspection not found');
    }

    const inspection = inspectionSnap.data()!;

    // Verify ownership
    if (inspection.inspectorId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not your inspection');
    }

    // Build summary input
    const findings = findingsSnap.docs.map((d) => d.data());
    const counts = {
      critical: findings.filter((f) => f.severity === 'critical').length,
      major: findings.filter((f) => f.severity === 'major').length,
      minor: findings.filter((f) => f.severity === 'minor').length,
      informational: findings.filter((f) => f.severity === 'informational').length,
    };

    const topFindings = findings
      .filter((f) => f.severity === 'critical' || f.severity === 'major')
      .slice(0, 5)
      .map((f) => `- ${f.component}: ${f.condition} (${f.severity})`)
      .join('\n');

    const client = getClient();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.3,
      system: `You are writing an executive summary for a home inspection report. Write 3-5 sentences that give the buyer an honest, balanced overall picture. Be professional and factual. Do not use alarmist language. Mention specific critical/major items by name. Note the overall condition relative to the property age.`,
      messages: [
        {
          role: 'user',
          content: `Property: ${inspection.property.propertyType.replace('_', ' ')} at ${inspection.property.address}, ${inspection.property.city}, ${inspection.property.state}
Year Built: ${inspection.property.yearBuilt || 'Unknown'}
Total findings: ${findings.length}
- Critical: ${counts.critical}
- Major: ${counts.major}
- Minor: ${counts.minor}
- Informational: ${counts.informational}

Total items inspected: ${inspection.checklistProgress.completed}
Items skipped: ${inspection.checklistProgress.skipped}

Top critical/major findings:
${topFindings || 'None'}

Write an executive summary for this inspection report.`,
        },
      ],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    return { summary: summary.trim() };
  }
);
