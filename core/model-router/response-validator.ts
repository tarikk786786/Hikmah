import { ValidationResult } from './types.js';

export class ResponseValidator {
  private static instance: ResponseValidator;

  public static getInstance(): ResponseValidator {
    if (!ResponseValidator.instance) {
      ResponseValidator.instance = new ResponseValidator();
    }
    return ResponseValidator.instance;
  }

  public extractJsonString(raw: string): string {
    const trimmed = raw.trim();

    // Check for fenced code block ```json ... ``` or ``` ... ```
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }

    // Check if whole text is an object or array
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.substring(firstBrace, lastBrace + 1);
    }

    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return trimmed.substring(firstBracket, lastBracket + 1);
    }

    return trimmed;
  }

  public validateJson<T>(rawContent: string, schema?: Record<string, unknown>): ValidationResult<T> {
    const jsonStr = this.extractJsonString(rawContent);

    try {
      const parsed = JSON.parse(jsonStr) as T;

      if (schema && typeof schema === 'object') {
        const required = (schema.required as string[]) || [];
        if (Array.isArray(required)) {
          const record = parsed as Record<string, unknown>;
          for (const field of required) {
            if (record[field] === undefined || record[field] === null) {
              return {
                valid: false,
                error: `Schema validation failed: Missing required field '${field}'`,
                rawContent
              };
            }
          }
        }
      }

      return {
        valid: true,
        data: parsed,
        rawContent
      };
    } catch (err: unknown) {
      return {
        valid: false,
        error: `Invalid JSON: ${(err as Error).message}`,
        rawContent
      };
    }
  }

  public sanitizeOutput(rawContent: string): string {
    let sanitized = rawContent;

    // Remove internal reasoning blocks if present <thinking>...</thinking>
    sanitized = sanitized.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Trim trailing markdown artifact fences if dangling
    const openFences = (sanitized.match(/```/g) || []).length;
    if (openFences % 2 !== 0) {
      sanitized += '\n```';
    }

    return sanitized.trim();
  }

  public detectTruncation(response: { content: string; maxTokens?: number; completionTokens?: number }): boolean {
    const content = response.content.trim();

    // Check if token limit hit exactly
    if (response.maxTokens && response.completionTokens && response.completionTokens >= response.maxTokens) {
      return true;
    }

    // Check for obvious mid-sentence cut-offs
    const endsAbruptly = /[a-zA-Z0-9,]$/.test(content);
    const hasUnclosedFence = (content.match(/```/g) || []).length % 2 !== 0;
    const hasUnclosedBrace = (content.match(/{/g) || []).length > (content.match(/}/g) || []).length;

    return endsAbruptly && (hasUnclosedFence || hasUnclosedBrace);
  }
}
