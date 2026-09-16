import { v4 as uuidv4 } from 'uuid';

export type ScopeEnvironment =
  | 'USER_OWNED'
  | 'AUTHORIZED_LAB'
  | 'CTF_CHALLENGE'
  | 'BUG_BOUNTY_PROGRAM'
  | 'INTERNAL_ASSESSMENT';

export interface TargetScope {
  id: string;
  target: string; // Domain, IP, CIDR, or repo URL
  environment: ScopeEnvironment;
  allowedTechniques: string[];
  disallowedTechniques: string[];
  notes?: string;
}

export interface AuthorizationRecord {
  id: string;
  scope: TargetScope;
  authorizedBy: string;
  authorizationProof: string; // e.g., 'DNS_TXT_RECORD_VERIFIED', 'WRITTEN_CONSENT_REF_99'
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
}

export class ScopeValidator {
  private static authorizations: Map<string, AuthorizationRecord> = new Map();

  static {
    // Seed default safe lab environment for local CTFs / local testing
    const labScope: TargetScope = {
      id: 'scope_local_lab',
      target: 'localhost',
      environment: 'AUTHORIZED_LAB',
      allowedTechniques: ['PORT_SCAN', 'VULN_SCAN', 'CODE_AUDIT', 'DEPENDENCY_CHECK'],
      disallowedTechniques: ['EXPLOITATION', 'DENIAL_OF_SERVICE']
    };

    const defaultRecord: AuthorizationRecord = {
      id: 'auth_lab_001',
      scope: labScope,
      authorizedBy: 'system_admin',
      authorizationProof: 'LOCAL_LOOPBACK_SELF_OWNED',
      validFrom: new Date(Date.now() - 1000 * 3600).toISOString(),
      validUntil: new Date(Date.now() + 1000 * 3600 * 24 * 365).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    ScopeValidator.authorizations.set(defaultRecord.id, defaultRecord);
  }

  public static registerAuthorization(record: AuthorizationRecord): void {
    ScopeValidator.authorizations.set(record.id, record);
  }

  public static getAuthorization(id: string): AuthorizationRecord | undefined {
    return ScopeValidator.authorizations.get(id);
  }

  public static validateTargetAuthorization(
    targetInput: string,
    actionTechnique: string,
    authorizationId?: string
  ): {
    allowed: boolean;
    reason: string;
    record?: AuthorizationRecord;
  } {
    const cleanTarget = targetInput.trim().toLowerCase();

    // Loopback / RFC1918 test environment shortcuts if registered
    if ((cleanTarget === '127.0.0.1' || cleanTarget === 'localhost') && (!authorizationId || authorizationId === 'auth_lab_001')) {
      const rec = ScopeValidator.authorizations.get('auth_lab_001')!;
      return {
        allowed: true,
        reason: 'Authorized on verified local lab loopback environment.',
        record: rec
      };
    }

    if (!authorizationId) {
      return {
        allowed: false,
        reason: 'CRITICAL SECURITY GUARD: Target requires a signed AuthorizationRecord ticket before active reconnaissance or security assessment is permitted.'
      };
    }

    const auth = ScopeValidator.authorizations.get(authorizationId);
    if (!auth) {
      return {
        allowed: false,
        reason: `Authorization ticket [${authorizationId}] not found in Hikmah Authorization Registry.`
      };
    }

    if (auth.status !== 'ACTIVE') {
      return {
        allowed: false,
        reason: `Authorization ticket [${authorizationId}] is ${auth.status}.`
      };
    }

    const now = new Date();
    if (now < new Date(auth.validFrom) || now > new Date(auth.validUntil)) {
      auth.status = 'EXPIRED';
      return {
        allowed: false,
        reason: `Authorization ticket [${authorizationId}] has expired.`
      };
    }

    // Verify target matches authorized scope target
    const scopeTarget = auth.scope.target.toLowerCase();
    const matchesTarget = cleanTarget === scopeTarget ||
      cleanTarget.endsWith(`.${scopeTarget}`) ||
      cleanTarget.includes(scopeTarget);

    if (!matchesTarget) {
      return {
        allowed: false,
        reason: `Target [${targetInput}] does not match authorized scope domain/IP [${auth.scope.target}].`
      };
    }

    // Check disallowed techniques
    if (auth.scope.disallowedTechniques.includes(actionTechnique)) {
      return {
        allowed: false,
        reason: `Technique [${actionTechnique}] is explicitly forbidden by the scope agreement.`
      };
    }

    return {
      allowed: true,
      reason: `Target and action authorized under scope [${auth.id}] (${auth.scope.environment}).`,
      record: auth
    };
  }
}
