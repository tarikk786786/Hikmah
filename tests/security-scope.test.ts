import { describe, it, expect } from 'vitest';
import { ScopeValidator, AuthorizationRecord } from '../security/authorization/scope-validator.js';

describe('ScopeValidator', () => {
  it('should auto-authorize localhost loopback in authorized lab scope', () => {
    const res = ScopeValidator.validateTargetAuthorization('localhost', 'PORT_SCAN');
    expect(res.allowed).toBe(true);
    expect(res.reason).toContain('Authorized on verified local lab');
  });

  it('should strictly reject arbitrary unauthorized external targets without authorization ticket', () => {
    const res = ScopeValidator.validateTargetAuthorization('target-company.com', 'PORT_SCAN');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('CRITICAL SECURITY GUARD');
  });

  it('should validate valid registered authorization ticket', () => {
    const customRecord: AuthorizationRecord = {
      id: 'auth_custom_pentest_99',
      scope: {
        id: 'scope_corp',
        target: 'testapp.internal.corp',
        environment: 'INTERNAL_ASSESSMENT',
        allowedTechniques: ['PORT_SCAN', 'VULN_SCAN'],
        disallowedTechniques: ['EXPLOITATION']
      },
      authorizedBy: 'Chief Information Security Officer',
      authorizationProof: 'CISO_SIGNED_MEMO_2026',
      validFrom: new Date(Date.now() - 3600000).toISOString(),
      validUntil: new Date(Date.now() + 3600000).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    ScopeValidator.registerAuthorization(customRecord);

    // Target match -> allowed
    const validCheck = ScopeValidator.validateTargetAuthorization(
      'testapp.internal.corp',
      'PORT_SCAN',
      'auth_custom_pentest_99'
    );
    expect(validCheck.allowed).toBe(true);

    // Target mismatch -> rejected
    const mismatchCheck = ScopeValidator.validateTargetAuthorization(
      'other-corp.com',
      'PORT_SCAN',
      'auth_custom_pentest_99'
    );
    expect(mismatchCheck.allowed).toBe(false);

    // Disallowed technique -> rejected
    const techniqueCheck = ScopeValidator.validateTargetAuthorization(
      'testapp.internal.corp',
      'EXPLOITATION',
      'auth_custom_pentest_99'
    );
    expect(techniqueCheck.allowed).toBe(false);
  });
});
