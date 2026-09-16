import { UniversalSkillManifest, SkillPermissions, SkillRiskLevel } from './types.js';
import crypto from 'crypto';

export function createDefaultPermissions(): SkillPermissions {
  return {
    network: {
      enabled: false,
      allowedDomains: [],
      allowAllOutbound: false,
    },
    filesystem: {
      read: ['./sandbox'],
      write: ['./sandbox/tmp'],
      tempOnly: true,
    },
    shell: {
      enabled: false,
      allowedCommands: [],
      subprocess: false,
    },
    credentials: {
      required: false,
      providers: [],
    },
    browser: {
      enabled: false,
      headlessOnly: true,
    },
    memory: {
      read: false,
      write: false,
    },
  };
}

export function computeManifestHash(manifest: Partial<UniversalSkillManifest>): string {
  const normalized = {
    id: manifest.id,
    version: manifest.version,
    runtime: manifest.runtime,
    permissions: manifest.permissions,
    dependencies: manifest.dependencies,
    tools: manifest.tools,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function normalizeSkillManifest(raw: Record<string, any>): UniversalSkillManifest {
  const id = String(raw.id || raw.name || 'unnamed-skill').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const version = String(raw.version || '1.0.0');
  const now = new Date().toISOString();

  const permissions: SkillPermissions = {
    network: {
      enabled: Boolean(raw.permissions?.network?.enabled ?? (typeof raw.permissions?.network === 'boolean' ? raw.permissions.network : false)),
      allowedDomains: Array.isArray(raw.permissions?.network?.allowedDomains)
        ? raw.permissions.network.allowedDomains
        : (Array.isArray(raw.permissions?.network?.allowed_domains) ? raw.permissions.network.allowed_domains : []),
      allowAllOutbound: Boolean(raw.permissions?.network?.allowAllOutbound ?? raw.permissions?.network?.allow_all_outbound),
    },
    filesystem: {
      read: Array.isArray(raw.permissions?.filesystem?.read) ? raw.permissions.filesystem.read : [],
      write: Array.isArray(raw.permissions?.filesystem?.write) ? raw.permissions.filesystem.write : [],
      tempOnly: Boolean(raw.permissions?.filesystem?.tempOnly ?? raw.permissions?.filesystem?.temp_only ?? true),
    },
    shell: {
      enabled: Boolean(raw.permissions?.shell?.enabled ?? false),
      allowedCommands: Array.isArray(raw.permissions?.shell?.allowedCommands) ? raw.permissions.shell.allowedCommands : [],
      subprocess: Boolean(raw.permissions?.shell?.subprocess ?? false),
    },
    credentials: {
      required: Boolean(raw.permissions?.credentials?.required ?? false),
      providers: Array.isArray(raw.permissions?.credentials?.providers) ? raw.permissions.credentials.providers : [],
    },
    browser: {
      enabled: Boolean(raw.permissions?.browser?.enabled ?? false),
      headlessOnly: Boolean(raw.permissions?.browser?.headlessOnly ?? true),
    },
    memory: {
      read: Boolean(raw.permissions?.memory?.read ?? false),
      write: Boolean(raw.permissions?.memory?.write ?? false),
    },
  };

  const riskLevel: SkillRiskLevel = 
    raw.risk?.level === 'CRITICAL' ? 'CRITICAL' :
    raw.risk?.level === 'HIGH' ? 'HIGH' :
    raw.risk?.level === 'MEDIUM' ? 'MEDIUM' : 'LOW';

  const manifest: UniversalSkillManifest = {
    id,
    name: String(raw.name || id),
    version,
    description: String(raw.description || 'Custom Hikmah Capability Skill'),
    author: raw.author ? String(typeof raw.author === 'object' ? raw.author.name : raw.author) : 'Hikmah User',
    publisher: {
      name: String(raw.publisher?.name || raw.author?.name || 'Hikmah Registry'),
      type: raw.publisher?.type || 'community',
      verified: Boolean(raw.publisher?.verified || false),
      repository: raw.publisher?.repository || raw.repository,
      homepage: raw.publisher?.homepage || raw.homepage,
      signature: raw.publisher?.signature || raw.signature,
    },
    license: String(raw.license || 'MIT'),
    categories: Array.isArray(raw.categories) ? raw.categories : ['Custom'],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : [],
    tools: Array.isArray(raw.tools) ? raw.tools : [],
    source: raw.source || 'local',
    repository: raw.repository,
    homepage: raw.homepage,
    runtime: {
      type: raw.runtime?.type || 'node',
      version: raw.runtime?.version || '>=18.0.0',
      entrypoint: raw.runtime?.entrypoint || 'index.js',
      env: raw.runtime?.env || {},
    },
    dependencies: {
      skills: Array.isArray(raw.dependencies?.skills) ? raw.dependencies.skills : [],
      packages: Array.isArray(raw.dependencies?.packages) ? raw.dependencies.packages : [],
      system: Array.isArray(raw.dependencies?.system) ? raw.dependencies.system : [],
    },
    hardware: {
      cpu: Boolean(raw.hardware?.cpu ?? true),
      minCores: raw.hardware?.minCores,
      gpu: Boolean(raw.hardware?.gpu ?? false),
      minVramGb: raw.hardware?.minVramGb,
      cudaRequired: Boolean(raw.hardware?.cudaRequired ?? false),
      rocmRequired: Boolean(raw.hardware?.rocmRequired ?? false),
      minRamGb: raw.hardware?.minRamGb || 1,
    },
    permissions,
    compatibility: {
      platforms: Array.isArray(raw.compatibility?.platforms) ? raw.compatibility.platforms : ['any'],
      architectures: Array.isArray(raw.compatibility?.architectures) ? raw.compatibility.architectures : ['any'],
      minHikmahVersion: raw.compatibility?.minHikmahVersion || '1.0.0',
    },
    risk: {
      level: riskLevel,
      reasons: Array.isArray(raw.risk?.reasons) ? raw.risk.reasons : [],
    },
    supportedAgents: Array.isArray(raw.supportedAgents || raw.supported_agents) 
      ? (raw.supportedAgents || raw.supported_agents) 
      : ['general-agent'],
    inputs: raw.inputs || {},
    outputs: raw.outputs || {},
    sandbox: {
      required: Boolean(raw.sandbox?.required ?? true),
      type: raw.sandbox?.type || 'isolated-process',
      memoryLimitMb: raw.sandbox?.memoryLimitMb || 512,
      timeoutSeconds: raw.sandbox?.timeoutSeconds || 60,
      readOnlyRootFs: Boolean(raw.sandbox?.readOnlyRootFs ?? true),
    },
    tests: {
      required: Boolean(raw.tests?.required ?? false),
      commands: Array.isArray(raw.tests?.commands) ? raw.tests.commands : [],
      testDirectory: raw.tests?.testDirectory,
      timeoutSeconds: raw.tests?.timeoutSeconds || 30,
    },
    certification: raw.certification || 'UNVERIFIED',
    state: raw.state || 'DISCOVERED',
    enabled: Boolean(raw.enabled ?? true),
    installedAt: raw.installedAt,
    updatedAt: now,
    createdAt: raw.createdAt || now,
    compositeOf: raw.compositeOf,
    isGenerated: Boolean(raw.isGenerated ?? false),
  };

  manifest.sha256 = raw.sha256 || computeManifestHash(manifest);
  return manifest;
}
