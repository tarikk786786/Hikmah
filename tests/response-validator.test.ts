import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseValidator } from '../core/model-router/response-validator.js';

describe('PRD 05: ResponseValidator JSON Extraction & Sanitization', () => {
  let validator: ResponseValidator;

  beforeEach(() => {
    validator = new ResponseValidator();
  });

  it('should extract and parse JSON from markdown code fences', () => {
    const markdown = `
Here is the requested output:
\`\`\`json
{
  "task": "code_review",
  "status": "APPROVED",
  "score": 95
}
\`\`\`
Hope this helps!`;

    const result = validator.validateJson<{ task: string; status: string; score: number }>(markdown);
    expect(result.valid).toBe(true);
    expect(result.data?.task).toBe('code_review');
    expect(result.data?.score).toBe(95);
  });

  it('should enforce required schema fields', () => {
    const raw = '{"task": "scan"}';
    const schema = {
      type: 'object',
      required: ['task', 'target']
    };

    const result = validator.validateJson(raw, schema);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing required field 'target'");
  });

  it('should sanitize thinking tags and dangling markdown fences', () => {
    const rawWithThinking = `
<thinking>
We need to scan the ports and summarize.
</thinking>
The analysis is complete.
\`\`\`ts
const port = 8080;`;

    const sanitized = validator.sanitizeOutput(rawWithThinking);
    expect(sanitized).not.toContain('<thinking>');
    expect(sanitized).not.toContain('We need to scan the ports');
    // Dangling fence was closed
    expect(sanitized.endsWith('```')).toBe(true);
  });

  it('should detect truncated responses', () => {
    const truncatedResponse = {
      content: 'Here is the code:\n```typescript\nfunction run() {',
      maxTokens: 100,
      completionTokens: 100
    };

    expect(validator.detectTruncation(truncatedResponse)).toBe(true);

    const completeResponse = {
      content: 'Here is the answer: 42.',
      maxTokens: 100,
      completionTokens: 20
    };

    expect(validator.detectTruncation(completeResponse)).toBe(false);
  });
});
