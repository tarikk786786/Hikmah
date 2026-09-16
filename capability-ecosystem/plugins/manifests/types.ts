export type PluginCertificationStatus =
  | 'UNVERIFIED'
  | 'SCANNED'
  | 'TESTED'
  | 'COMMUNITY'
  | 'VERIFIED'
  | 'CERTIFIED'
  | 'DEPRECATED'
  | 'QUARANTINED';

export interface UniversalPluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'integration' | 'adapter' | 'composite' | 'custom';
  publisher: {
    name: string;
    verified: boolean;
    repository?: string;
  };
  license: string;
  capabilities: string[];
  providers: string[];
  mcp?: {
    server: string;
    tools: string[];
  };
  permissions: {
    network: boolean;
    allowedDomains?: string[];
    account?: string;
    filesystem?: boolean;
    credentials: string[];
    risk: {
      read: 'LOW' | 'MEDIUM' | 'HIGH';
      write: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  };
  runtime: {
    type: 'container' | 'process' | 'wasm';
    requirements?: string;
  };
  dependencies: {
    plugins: string[];
    providers: string[];
    skills: string[];
  };
  accounts: {
    supported: boolean;
    multiple: boolean;
  };
  events?: {
    subscriptions: string[];
    webhooks: string[];
  };
  sandbox: {
    required: boolean;
  };
  certification: PluginCertificationStatus;
  enabled: boolean;
  isInstalled: boolean;
  installedAt?: string;
  createdAt: string;
  updatedAt: string;
}
