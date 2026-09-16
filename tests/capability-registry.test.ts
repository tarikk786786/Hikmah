import { describe, it, expect } from 'vitest';
import { CapabilityRegistry } from '../core/capabilities/registry.js';
import { Capability } from '../core/capabilities/types.js';

describe('CapabilityRegistry', () => {
  it('should list foundational registered capabilities', () => {
    const registry = CapabilityRegistry.getInstance();
    const list = registry.list();
    expect(list.length).toBeGreaterThanOrEqual(4);

    const names = list.map(c => c.name);
    expect(names).toContain('Web Intelligence & Search');
    expect(names).toContain('Safe Math Evaluator');
  });

  it('should register and unregister a new custom capability', () => {
    const registry = CapabilityRegistry.getInstance();
    const customCap: Capability = {
      id: 'cap_test_custom',
      name: 'Test Custom Capability',
      version: '1.0.0',
      category: 'custom',
      description: 'Custom capability for test assertion',
      provider: 'test',
      type: 'TOOL',
      input_schema: { type: 'object', properties: { testKey: { type: 'string' } }, required: ['testKey'] },
      output_schema: { type: 'object' },
      permissions: [],
      risk_level: 'LOW',
      runtime: 'VERCEL',
      supported_environments: ['node'],
      timeout: 5000,
      retry_policy: { maxRetries: 1, backoffMs: 500 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['test'],
      execute: async (input) => ({ echo: input.testKey })
    };

    registry.register(customCap);
    expect(registry.get('cap_test_custom')).toBeDefined();

    // Verify input validation
    const invalidVal = registry.validateInput(customCap, {});
    expect(invalidVal.valid).toBe(false);

    const validVal = registry.validateInput(customCap, { testKey: 'hello' });
    expect(validVal.valid).toBe(true);

    registry.unregister('cap_test_custom');
    expect(registry.get('cap_test_custom')).toBeUndefined();
  });

  it('should execute registered capability with execution time and audit', async () => {
    const registry = CapabilityRegistry.getInstance();
    const result = await registry.execute(
      'cap_tool_calculator',
      { expression: '15 + 27' },
      {
        userId: 'usr_test',
        correlation: { requestId: 'req_test' }
      }
    );

    expect(result.success).toBe(true);
    expect(result.data.result).toBe(42);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
