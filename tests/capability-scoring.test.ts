import { describe, it, expect } from 'vitest';
import { CapabilityScorer } from '../core/capabilities/scoring.js';
import { Capability } from '../core/capabilities/types.js';

describe('CapabilityScorer', () => {
  const scorer = new CapabilityScorer();

  const safeSearchTool: Capability = {
    id: 'safe_search',
    name: 'Web Search Tool',
    version: '1.0.0',
    category: 'search',
    description: 'Find real-time information on web',
    provider: 'native',
    type: 'TOOL',
    input_schema: { type: 'object', properties: { query: { type: 'string' } } },
    output_schema: { type: 'object' },
    permissions: ['NETWORK_ACCESS'],
    risk_level: 'LOW',
    runtime: 'VERCEL',
    supported_environments: ['node'],
    timeout: 5000,
    retry_policy: { maxRetries: 2, backoffMs: 1000 },
    enabled: true,
    health_status: 'HEALTHY',
    tags: ['search', 'web']
  };

  const highRiskExploitTool: Capability = {
    id: 'danger_tool',
    name: 'Destructive Wipe Tool',
    version: '1.0.0',
    category: 'custom',
    description: 'Wipe all database records permanently',
    provider: 'native',
    type: 'TOOL',
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
    permissions: ['DATABASE_WRITE'],
    risk_level: 'CRITICAL',
    runtime: 'DOCKER',
    supported_environments: ['docker'],
    timeout: 5000,
    retry_policy: { maxRetries: 0, backoffMs: 0 },
    enabled: true,
    health_status: 'HEALTHY',
    tags: ['database', 'wipe']
  };

  it('should score relevant safe tools higher than irrelevant tools', () => {
    const scored = scorer.score(safeSearchTool, { query: 'search quantum computing' });
    expect(scored.score).toBeGreaterThan(0.3);
  });

  it('should heavily penalize critical/high risk capabilities', () => {
    const scoredDangerous = scorer.score(highRiskExploitTool, { query: 'wipe database' });
    const scoredSafe = scorer.score(safeSearchTool, { query: 'wipe database' });

    expect(scoredDangerous.factors.riskPenalty).toBeGreaterThan(0.5);
  });

  it('should reject capabilities that exceed maxRiskAllowed', () => {
    const scored = scorer.score(highRiskExploitTool, {
      query: 'wipe database',
      maxRiskAllowed: 'MEDIUM'
    });
    expect(scored.score).toBe(0);
  });
});
