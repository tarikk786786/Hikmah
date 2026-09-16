import { describe, it, expect } from 'vitest';
import { ContextualCapabilityDiscovery } from '../core/capabilities/discovery.js';

describe('ContextualCapabilityDiscovery', () => {
  const discovery = new ContextualCapabilityDiscovery();

  it('should detect document intent and discover document processor', () => {
    const res = discovery.discoverRelevant('Please summarize this PDF file and extract text');
    expect(res.intentCategory).toBe('documents');
    const capNames = res.capabilities.map(c => c.name);
    expect(capNames).toContain('Document & PDF Processor');
  });

  it('should detect security intent for authorized vulnerability query', () => {
    const res = discovery.discoverRelevant('Run authorized port scan and vulnerability recon on localhost');
    expect(res.intentCategory).toBe('security');
    const capNames = res.capabilities.map(c => c.name);
    expect(capNames).toContain('Authorized Security Assessment Agent');
  });

  it('should detect coding repository intent', () => {
    const res = discovery.discoverRelevant('Inspect this GitHub repo and fix unit test errors');
    expect(res.intentCategory).toBe('coding');
    const capNames = res.capabilities.map(c => c.name);
    expect(capNames).toContain('Coding & Repository Agent (OpenHands Integration)');
  });
});
