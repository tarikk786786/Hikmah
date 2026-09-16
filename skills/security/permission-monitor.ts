import { UniversalSkillManifest, SkillPermissions } from '../manifests/types.js';
import { SkillKillSwitch } from './kill-switch.js';

export class SkillSecurityViolationError extends Error {
  public readonly skillId: string;
  public readonly violationType: string;
  public readonly details: Record<string, any>;

  constructor(skillId: string, violationType: string, message: string, details: Record<string, any> = {}) {
    super(`[SECURITY VIOLATION] Skill '${skillId}' violated policy: ${violationType} - ${message}`);
    this.name = 'SkillSecurityViolationError';
    this.skillId = skillId;
    this.violationType = violationType;
    this.details = details;
  }
}

export class SkillPermissionMonitor {
  private static instance: SkillPermissionMonitor;
  private killSwitch: SkillKillSwitch;
  private auditLog: Array<{
    skillId: string;
    action: string;
    permitted: boolean;
    reason?: string;
    timestamp: string;
  }> = [];

  constructor() {
    this.killSwitch = SkillKillSwitch.getInstance();
  }

  public static getInstance(): SkillPermissionMonitor {
    if (!SkillPermissionMonitor.instance) {
      SkillPermissionMonitor.instance = new SkillPermissionMonitor();
    }
    return SkillPermissionMonitor.instance;
  }

  /**
   * Enforces network access permissions declared in the manifest.
   * If network is disabled or destination domain is not allowed, blocks and quarantines.
   */
  public checkNetworkAccess(manifest: UniversalSkillManifest, targetUrlOrHost: string): boolean {
    const perm = manifest.permissions.network;
    let host = targetUrlOrHost;
    try {
      if (targetUrlOrHost.startsWith('http://') || targetUrlOrHost.startsWith('https://')) {
        host = new URL(targetUrlOrHost).hostname;
      }
    } catch {
      // keep raw host
    }

    if (!perm.enabled) {
      const reason = `Attempted network connection to '${host}' while network permission is disabled`;
      this.handleViolation(manifest.id, 'UNDECLARED_NETWORK_EGRESS', reason, { host, manifestDeclared: perm });
      throw new SkillSecurityViolationError(manifest.id, 'UNDECLARED_NETWORK_EGRESS', reason, { host });
    }

    if (!perm.allowAllOutbound) {
      const domainAllowed = perm.allowedDomains.some(d => {
        if (d === '*' || d === host) return true;
        if (d.startsWith('*.') && host.endsWith(d.slice(2))) return true;
        return false;
      });

      if (!domainAllowed) {
        const reason = `Connection to domain '${host}' is not in declared allowed domains list: [${perm.allowedDomains.join(', ')}]`;
        this.handleViolation(manifest.id, 'UNAUTHORIZED_DOMAIN_ACCESS', reason, { host, allowed: perm.allowedDomains });
        throw new SkillSecurityViolationError(manifest.id, 'UNAUTHORIZED_DOMAIN_ACCESS', reason, { host, allowed: perm.allowedDomains });
      }
    }

    this.auditLog.push({
      skillId: manifest.id,
      action: `network:connect:${host}`,
      permitted: true,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Enforces filesystem read/write operations against declared paths.
   */
  public checkFilesystemAccess(manifest: UniversalSkillManifest, path: string, operation: 'read' | 'write'): boolean {
    const fsPerm = manifest.permissions.filesystem;

    if (operation === 'write') {
      if (!fsPerm.write || fsPerm.write.length === 0) {
        const reason = `Attempted filesystem write to '${path}' with no write permissions declared`;
        this.handleViolation(manifest.id, 'UNAUTHORIZED_FS_WRITE', reason, { path });
        throw new SkillSecurityViolationError(manifest.id, 'UNAUTHORIZED_FS_WRITE', reason, { path });
      }
    }

    if (operation === 'read') {
      if (fsPerm.read && fsPerm.read.length > 0 && !fsPerm.read.includes('*')) {
        const match = fsPerm.read.some(p => path.startsWith(p));
        if (!match) {
          const reason = `Attempted filesystem read from undeclared location '${path}'`;
          this.handleViolation(manifest.id, 'UNAUTHORIZED_FS_READ', reason, { path });
          throw new SkillSecurityViolationError(manifest.id, 'UNAUTHORIZED_FS_READ', reason, { path });
        }
      }
    }

    this.auditLog.push({
      skillId: manifest.id,
      action: `fs:${operation}:${path}`,
      permitted: true,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Enforces shell and subprocess command execution.
   */
  public checkShellExecution(manifest: UniversalSkillManifest, command: string): boolean {
    const shellPerm = manifest.permissions.shell;

    if (!shellPerm.enabled) {
      const reason = `Attempted shell execution ('${command}') while shell permissions are disabled`;
      this.handleViolation(manifest.id, 'UNDECLARED_SHELL_EXECUTION', reason, { command });
      throw new SkillSecurityViolationError(manifest.id, 'UNDECLARED_SHELL_EXECUTION', reason, { command });
    }

    if (shellPerm.allowedCommands && shellPerm.allowedCommands.length > 0) {
      const cmdBase = command.trim().split(/\s+/)[0];
      if (!shellPerm.allowedCommands.includes(cmdBase)) {
        const reason = `Command '${cmdBase}' is not in declared allowedCommands: [${shellPerm.allowedCommands.join(', ')}]`;
        this.handleViolation(manifest.id, 'UNAUTHORIZED_COMMAND', reason, { command, cmdBase });
        throw new SkillSecurityViolationError(manifest.id, 'UNAUTHORIZED_COMMAND', reason, { command, cmdBase });
      }
    }

    this.auditLog.push({
      skillId: manifest.id,
      action: `shell:exec:${command}`,
      permitted: true,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  public getAuditLog(skillId?: string): typeof this.auditLog {
    if (skillId) {
      return this.auditLog.filter(l => l.skillId === skillId);
    }
    return [...this.auditLog];
  }

  private handleViolation(skillId: string, violationType: string, reason: string, details: Record<string, any>): void {
    this.auditLog.push({
      skillId,
      action: violationType,
      permitted: false,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Auto-quarantine on critical policy violations
    this.killSwitch.quarantine(skillId, `Policy Violation: ${violationType} - ${reason}`, details, 'SKILL_PERMISSION_MONITOR');
  }
}
