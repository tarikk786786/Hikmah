# Stagehand Semantic Actions Reference

## 1. Overview
Stagehand introduces high-level AI semantic capabilities above deterministic driver operations:
1. `act(options)`: Translates natural language directives into concrete DOM actions.
2. `extract(options)`: Extracts structured JSON objects matching schema requirements from the active page.
3. `observe(query)`: Detects interactive affordances and returns suggested actions with confidence scores.

---

## 2. Semantic Act

```typescript
const result = await orchestrator.actSemantic(sessionId, {
  instruction: 'click on the sign in button',
});
```

The semantic engine:
1. Extracts interactive elements (`<button>`, `<a href>`, `<input>`, `[role="button"]`).
2. Matches user intent against element labels, `aria-label`, placeholder, and text content.
3. Dispatches the action via the driver and returns execution timing and success indicators.

---

## 3. Schema Extraction

```typescript
const data = await orchestrator.extractSemantic(sessionId, {
  schema: {
    title: 'string',
    articleHeadlines: ['string'],
    externalLinks: [{ text: 'string', href: 'string' }],
  },
});
```

---

## 4. Affordance Observation

```typescript
const observation = await orchestrator.observe(sessionId, 'search');
// Returns suggestions such as:
// [
//   { description: 'Type into "Search Hacker News"', action: 'type', selector: 'input[name="q"]', confidence: 0.85 }
// ]
```
