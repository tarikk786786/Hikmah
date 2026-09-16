/**
 * HIKMAH - Step 23: Skill Marketplace / Skill Intelligence Engine
 * Universal Skill Manifest & Domain Types
 */

export type SkillRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SkillCertificationStatus = 
  | 'UNVERIFIED' 
  | 'SCANNED' 
  | 'TESTED' 
  | 'REVIEWED' 
  | 'CERTIFIED';

export type SkillLifecycleState =
  | 'DISCOVERED'
  | 'IMPORTED'
  | 'SCANNED'
  | 'VALIDATED'
  | 'INSTALLED'
  | 'ENABLED'
  | 'USED'
  | 'MONITORED'
  | 'UPDATED'
  | 'DEPRECATED'
  | 'QUARANTINED'
  | 'REMOVED';

export type SkillRuntimeType = 
  | 'python' 
  | 'node' 
  | 'go' 
  | 'rust' 
  | 'shell' 
  | 'mcp' 
  | 'container' 
  | 'wasm';

export type SkillCategory =
  | 'AI / LLM'
  | 'Automation'
  | 'Browser'
  | 'Coding'
  | 'DevOps'
  | 'Cybersecurity'
  | 'SOC'
  | 'OSINT'
  | 'Research'
  | 'Documents'
  | 'PDF'
  | 'OCR'
  | 'Vision'
  | 'Audio'
  | 'Video'
  | 'Voice'
  | 'Translation'
  | 'Writing'
  | 'SEO'
  | 'Marketing'
  | 'E-commerce'
  | 'Shopify'
  | 'Finance'
  | 'Data Analytics'
  | 'Database'
  | 'GitHub'
  | 'Cloud'
  | 'Linux'
  | 'Windows'
  | 'Networking'
  | 'Geospatial'
  | 'Education'
  | 'Productivity'
  | 'Communication'
  | 'Social'
  | 'India'
  | 'Legal-information'
  | 'Science'
  | 'Engineering'
  | 'Custom';

export interface SkillPermissions {
  network: {
    enabled: boolean;
    allowedDomains: string[];
    allowAllOutbound?: boolean;
  };
  filesystem: {
    read: string[];
    write: string[];
    tempOnly?: boolean;
  };
  shell: {
    enabled: boolean;
    allowedCommands?: string[];
    subprocess: boolean;
  };
  credentials: {
    required: boolean;
    providers: string[];
  };
  browser?: {
    enabled: boolean;
    headlessOnly?: boolean;
  };
  memory?: {
    read: boolean;
    write: boolean;
  };
}

export interface SkillHardwareRequirements {
  cpu: boolean;
  minCores?: number;
  gpu: boolean;
  minVramGb?: number;
  cudaRequired?: boolean;
  rocmRequired?: boolean;
  minRamGb?: number;
}

export interface SkillDependencyItem {
  name: string;
  version: string;
  type: 'python' | 'npm' | 'system' | 'skill' | 'mcp' | 'model';
  optional?: boolean;
}

export interface SkillDependencies {
  skills: string[];
  packages: SkillDependencyItem[];
  system: string[];
}

export interface SkillCompatibilityCriteria {
  platforms: ('win32' | 'linux' | 'darwin' | 'any')[];
  architectures: ('x64' | 'arm64' | 'any')[];
  minHikmahVersion?: string;
}

export interface SkillPublisher {
  name: string;
  type: 'user' | 'organization' | 'community' | 'official' | 'system';
  verified: boolean;
  repository?: string;
  homepage?: string;
  signature?: string;
  contact?: string;
}

export interface SkillTestSpecification {
  required: boolean;
  commands: string[];
  testDirectory?: string;
  timeoutSeconds?: number;
}

export interface SkillSandboxConfig {
  required: boolean;
  type: 'isolated-process' | 'worker-thread' | 'container' | 'wasm';
  memoryLimitMb?: number;
  timeoutSeconds?: number;
  readOnlyRootFs?: boolean;
}

export interface UniversalSkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  publisher: SkillPublisher;
  license: string;
  categories: SkillCategory[];
  tags: string[];
  capabilities: string[];
  tools: string[];
  source: 'local' | 'private' | 'github' | 'mcp' | 'public_registry';
  repository?: string;
  homepage?: string;
  sha256?: string;
  signature?: string;

  runtime: {
    type: SkillRuntimeType;
    version?: string;
    entrypoint: string;
    env?: Record<string, string>;
  };

  dependencies: SkillDependencies;
  hardware: SkillHardwareRequirements;
  permissions: SkillPermissions;
  compatibility: SkillCompatibilityCriteria;

  risk: {
    level: SkillRiskLevel;
    reasons: string[];
  };

  supportedAgents: string[];
  inputs: Record<string, { type: string; description?: string; required?: boolean }>;
  outputs: Record<string, { type: string; description?: string }>;

  sandbox: SkillSandboxConfig;
  tests: SkillTestSpecification;
  certification: SkillCertificationStatus;
  state: SkillLifecycleState;

  enabled: boolean;
  installedAt?: string;
  updatedAt?: string;
  createdAt: string;

  // Composite / generated origin metadata
  compositeOf?: string[];
  isGenerated?: boolean;
}

export interface SkillLockEntry {
  id: string;
  version: string;
  sha256: string;
  source: string;
  installedAt: string;
  dependencies: Record<string, string>;
  permissionsHash: string;
}

export interface SkillLockFile {
  version: number;
  generatedAt: string;
  skills: Record<string, SkillLockEntry>;
}

export interface SkillSecurityFinding {
  ruleId: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  file?: string;
  line?: number;
  evidence?: string;
}

export interface SkillSecurityScanResult {
  scanId: string;
  skillId: string;
  version: string;
  timestamp: string;
  passed: boolean;
  riskLevel: SkillRiskLevel;
  findings: SkillSecurityFinding[];
  secretsFound: string[];
  dangerousAPIs: string[];
  declaredPermissions: SkillPermissions;
  inferredPermissions: Partial<SkillPermissions>;
  permissionDiscrepancies: string[];
  sbom: {
    packages: Array<{ name: string; version: string; license?: string }>;
  };
}

export type SkillCompatibilityStatus = 
  | 'COMPATIBLE' 
  | 'PARTIALLY_COMPATIBLE' 
  | 'INCOMPATIBLE' 
  | 'NEEDS_DEPENDENCY' 
  | 'NEEDS_HARDWARE' 
  | 'NEEDS_PERMISSION' 
  | 'NEEDS_CREDENTIAL';

export interface SkillCompatibilityReport {
  skillId: string;
  status: SkillCompatibilityStatus;
  compatible: boolean;
  issues: string[];
  missingDependencies: SkillDependencyItem[];
  missingHardware: string[];
  platformMatch: boolean;
  archMatch: boolean;
}

export interface SkillExecutionMetric {
  skillId: string;
  version: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  error?: string;
  memoryUsedMb?: number;
  toolCallsCount: number;
  securityViolation?: boolean;
}

export interface SkillCanDoAssessment {
  intent: string;
  canDo: 'YES_EXISTING' | 'YES_COMPOSITION' | 'YES_CAN_GENERATE' | 'PARTIAL' | 'NO';
  confidence: number;
  explanation: string;
  recommendedSkillIds: string[];
  compositionPlan?: {
    steps: Array<{
      order: number;
      capability: string;
      suggestedSkillId?: string;
      status: 'AVAILABLE' | 'NEEDS_GENERATION' | 'MISSING';
    }>;
  };
  missingCapabilities: string[];
}
