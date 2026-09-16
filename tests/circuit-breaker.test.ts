import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../core/model-router/circuit-breaker.js';

describe('PRD 05: CircuitBreaker 5-State Resilient Failover', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      degradedThreshold: 1,
      failureThreshold: 3,
      cooldownMs: 100, // short cooldown for fast test execution
      recoverySuccessThreshold: 2
    });
  });

  it('should start in HEALTHY state and allow execution', () => {
    expect(breaker.canExecute('openai')).toBe(true);
    const health = breaker.getHealth('openai');
    expect(health.state).toBe('HEALTHY');
  });

  it('should transition to DEGRADED on single failure and FAILED on consecutive failures', () => {
    breaker.recordFailure('openai', 'Rate limit 429');
    expect(breaker.getHealth('openai').state).toBe('DEGRADED');
    expect(breaker.canExecute('openai')).toBe(true); // degraded still executes

    breaker.recordFailure('openai', 'Rate limit 429');
    expect(breaker.getHealth('openai').state).toBe('DEGRADED');

    breaker.recordFailure('openai', 'Connection timeout');
    expect(breaker.getHealth('openai').state).toBe('FAILED');
    expect(breaker.canExecute('openai')).toBe(false);
  });

  it('should reject execution via executeWithBreaker when FAILED', async () => {
    breaker.recordFailure('anthropic', '500 Internal Error');
    breaker.recordFailure('anthropic', '500 Internal Error');
    breaker.recordFailure('anthropic', '500 Internal Error');

    await expect(
      breaker.executeWithBreaker('anthropic', async () => 'result')
    ).rejects.toThrow(/Circuit breaker for provider \[anthropic\] is OPEN/);
  });

  it('should transition to RECOVERING after cooldown and back to HEALTHY on successful probes', async () => {
    breaker.recordFailure('gemini', 'Error 1');
    breaker.recordFailure('gemini', 'Error 2');
    breaker.recordFailure('gemini', 'Error 3');
    expect(breaker.getHealth('gemini').state).toBe('FAILED');

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 120));

    // After cooldown, canExecute returns true and transitions state to RECOVERING
    expect(breaker.canExecute('gemini')).toBe(true);
    expect(breaker.getHealth('gemini').state).toBe('RECOVERING');

    // 1st recovery success
    breaker.recordSuccess('gemini');
    expect(breaker.getHealth('gemini').state).toBe('RECOVERING');

    // 2nd recovery success (reaches recoverySuccessThreshold)
    breaker.recordSuccess('gemini');
    expect(breaker.getHealth('gemini').state).toBe('HEALTHY');
  });

  it('should immediately trip back to FAILED if error occurs during RECOVERING', async () => {
    breaker.recordFailure('ollama', 'Error 1');
    breaker.recordFailure('ollama', 'Error 2');
    breaker.recordFailure('ollama', 'Error 3');

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(breaker.canExecute('ollama')).toBe(true);
    expect(breaker.getHealth('ollama').state).toBe('RECOVERING');

    breaker.recordFailure('ollama', 'Probe failed');
    expect(breaker.getHealth('ollama').state).toBe('FAILED');
  });
});
