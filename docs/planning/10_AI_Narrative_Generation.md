▸ Extended thinking (952 chars)  
# AI Narrative Generation

## Overview

The core productivity feature of Inspectly. Instead of typing out finding descriptions in the field, inspectors select structured inputs -- component, condition, severity -- and the system generates professional narrative language via the Claude API. This eliminates the hours inspectors spend writing up reports after leaving the property. The generated text follows home inspection industry conventions: factual, liability-aware, and actionable.

## Dependencies

- `02_Database_Schema.md` -- `findings` subcollection (`narrative`, `recommendation`, `narrativeSource`), `commentLibrary` collection
- `03_API_Endpoints.md` -- `generateNarrative` and `generateExecutiveSummary` callable functions
- `08_Finding_Entry_Severity.md` -- Structured input fields that feed generation, UI states for narrative display
- `12_Report_Preview_Publish.md` -- Executive summary generation at publish time

## Narrative Generation

### Input to Output

The inspector provides structured data. The AI returns two text blocks.

**Input (from finding entry):**
- `component`: string (e.g., "Water Heater")
- `condition`: string (e.g., "Corroded supply lines")
- `severity`: enum (critical, major, minor, informational)
- `context`: optional string (inspector's freeform note, max 200 chars)

**Output:**
- `narrative`: 1-3 sentences describing the finding in professional inspection language
- `recommendation`: 1 sentence describing the suggested action

**Example:**

Input: Water Heater / Corroded supply lines / Major / "copper green, maybe 15 years old"

Narrative: "The water heater supply lines exhibit significant corrosion with visible copper oxide (green patina) buildup at the fittings and along the line length. The extent of corrosion suggests the supply lines are approaching or have exceeded their expected service life, which increases the risk of a slow leak or sudden failure."

Recommendation: "Recommend evaluation and replacement of the corroded water heater supply lines by a licensed plumber."

### Prompt Design

The Claude API prompt uses a system message establishing the persona and output constraints, with the structured input in the user message.

**System message key instructions:**
- Write as a professional home inspector documenting findings for a buyer
- Use factual, objective language. Avoid alarmist or minimizing tone.
- Do not diagnose root causes beyond what is visually observable
- Do not estimate repair costs
- Use industry-standard terminology
- Match narrative length to severity: critical findings get 2-3 sentences, informational items get 1 sentence
- Recommendation should name the appropriate specialist when relevant (plumber, electrician, structural engineer, roofer, HVAC technician)
- Never use first person. Use passive voice or refer to "the inspector"
- Include the word "recommend" in recommendations (industry convention for liability protection)

**User message template:**
```
Component: {component}
Condition: {condition}
Severity: {severity}
Inspector notes: {context or "None"}

Generate a professional inspection finding narrative and recommendation.
```

**Model configuration:**
- Model: claude-haiku-4-5-20251001 (fast, cost-effective for short structured generation)
- Max tokens: 300
- Temperature: 0.3 (low variance -- inspection language should be consistent)

Using Haiku rather than a larger model because narratives are short, formulaic, and latency matters in the field. Quality is sufficient for this task given the strong system prompt constraints.

### Response Parsing

The prompt instructs Claude to return the response in a structured format:

```
NARRATIVE: [text]
RECOMMENDATION: [text]
```

Parse by splitting on the labels. If parsing fails (model returns unstructured text), use the full response as the narrative and set recommendation to a generic default based on severity:
- Critical/Major: "Recommend further evaluation by a qualified professional."
- Minor: "Recommend repair or monitoring as part of routine maintenance."
- Informational: (no recommendation)

### Latency and UX

Expected latency: 1-3 seconds via Haiku.

The finding entry screen does not block on narrative generation. When the inspector selects component + condition + severity:

1. Narrative field shows skeleton loading state with "Generating..."
2. API call fires via `generateNarrative` Cloud Function
3. Inspector can add photos, adjust other fields, or navigate to the next finding while waiting
4. When response arrives, narrative and recommendation fields populate
5. If the inspector has already typed in the narrative field manually, the AI result is discarded (manual entry takes precedence)

### Error Handling

| Scenario | Behavior |
|----------|----------|
| API timeout (>10s) | Show "AI unavailable" with "Retry" and "Write manually" options |
| API error (5xx) | Same as timeout |
| Rate limit exceeded | Show "AI busy, try again shortly" with countdown |
| Offline | Show "Offline -- will generate when connected" or "Write manually" |

Errors never block the finding entry flow. The inspector can always write manually.

## Comment Library

### Purpose

A personal (and optionally firm-shared) collection of saved narratives. Inspectors encounter the same defects regularly -- "double-tapped breaker" appears in a majority of inspections. The comment library lets them reuse proven language without waiting for AI generation.

### Building the Library

Two paths to save a narrative:

1. **From a finding**: After AI generates or the inspector writes a narrative, a "Save to Library" action (bookmark icon) saves the component + condition + severity + narrative + recommendation as a `commentLibrary` document.
2. **Manual creation**: From Settings > Comment Library, the inspector can create entries directly.

Saved entries include `useCount` (incremented each time the entry is applied to a finding) for popularity sorting.

### Using the Library

On the finding entry screen, a "Saved" button next to the narrative field opens the comment library filtered to the selected component. If component and condition both match an entry, that entry is highlighted as a "Best Match."

Library view:
- Filtered by current component (if selected)
- Sorted by `useCount` descending (most-used first)
- Search bar for free text search across narrative content
- Tap an entry to preview the full narrative and recommendation
- "Use" button applies the narrative and recommendation to the current finding, sets `narrativeSource` to `"manual"` (library entries are treated as manual for tracking purposes)

### Firm Sharing

If the inspector has a `firmId`, the library shows two tabs: "Mine" and "Firm." Firm entries are `commentLibrary` documents where `firmId` matches.

Any firm member can save an entry as a firm entry (sets `firmId` on the document). Firm admins can delete firm entries. Regular inspectors can only delete their own firm entries.

## Executive Summary Generation

### When It Runs

Triggered during the publish flow (see `12_Report_Preview_Publish.md`) when the inspector reaches the executive summary step. Called via the `generateExecutiveSummary` Cloud Function.

### Input

The function reads all findings from the inspection and builds a structured summary:

- Total findings by severity (critical: X, major: Y, minor: Z, informational: W)
- Top 3-5 critical/major findings with component and condition
- Property type and age (from inspection setup)
- Total items inspected vs. skipped

### Output

A 3-5 sentence executive summary suitable for a report cover page. Tone: balanced, professional, gives the buyer an honest overall picture.

**Example:**

"This inspection of the single-family residence at 123 Oak Street identified 47 findings across 142 inspected items. Three items require immediate attention: the main electrical panel contains double-tapped breakers, the water heater supply lines are significantly corroded, and the roof exhibits active flashing deterioration at the chimney. Eight additional items are flagged for repair or specialist evaluation. Overall, the home is in fair condition for its age, with the electrical and plumbing systems requiring the most attention."

### Editing

The generated summary appears in an editable text area. The inspector can:
- Accept as-is
- Edit the generated text
- Clear and write their own
- Regenerate (calls the API again)

## Narrative Source Tracking

Every finding records how its narrative was produced:

| `narrativeSource` | Meaning |
|-------------------|---------|
| `"ai"` | AI-generated, accepted without edits |
| `"ai_edited"` | AI-generated, then modified by inspector |
| `"manual"` | Written by inspector or applied from comment library |

This tracking serves two purposes:
1. Quality analysis: what percentage of AI narratives are accepted vs. edited helps tune the prompt over time
2. Firm consistency: firm admins can see if inspectors are using consistent language

Source tracking is internal -- it does not appear in the published report.

## Cost Management

### Per-Inspection Estimate

A typical inspection has 20-50 findings. At ~150 input tokens and ~150 output tokens per narrative call:

- Per finding: ~300 tokens (Haiku pricing)
- Per inspection (40 findings): ~12,000 tokens
- Executive summary: ~2,000 tokens (larger input context)
- Total per inspection: ~14,000 tokens

At Haiku pricing, this is negligible per inspection. The comment library further reduces API calls as inspectors build their library.

### Rate Limiting

- 60 narrative generation calls per user per hour [default]
- 5 executive summary calls per user per hour [default]
- Rate limits enforced in the Cloud Function, not the client

A typical inspection generates 20-50 narrative calls spread over 1-3 hours of inspection time, well within limits.

## Gaps & Assumptions

1. **Prompt iteration** -- The system prompt described above is a starting point. Effective inspection narrative prompts will require iteration with practicing inspectors reviewing output quality. Plan for prompt versioning so improvements can roll out without code changes (store prompt templates in Firestore or Remote Config).
2. **Regional language differences** -- Inspection terminology varies by region (e.g., "crawl space" vs. "sub-area" in the Pacific Northwest). The initial prompt uses broadly accepted terms. Regional prompt variants may be needed post-MVP.
3. **Liability language** -- Home inspectors are careful about liability. Words like "defective" or "dangerous" can create legal exposure. The prompt constrains language but a legal review of generated outputs is advisable before production launch.
4. **Model fallback** -- If Haiku is unavailable, no fallback model is specified. Default: fail gracefully (inspector writes manually). Could add Sonnet as a fallback at higher cost.
5. **Photo-aware narratives** -- Current design generates narratives from text input only. Future enhancement: include photo analysis to catch details the structured input might miss (e.g., identifying a specific brand from a photo). Deferred to `18_Future_Features.md`.
6. **Multi-language support** -- Narratives are English-only in v1. Some markets may need Spanish language reports. Deferred.  
