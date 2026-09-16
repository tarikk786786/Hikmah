import { UniversalPluginManifest } from '../manifests/types.js';
import { Provider } from '../../providers/interfaces/provider.js';

export interface PluginDefinitionInput extends Partial<UniversalPluginManifest> {
  id: string;
  name: string;
  version: string;
  description: string;
  providers?: Provider[];
}

export function definePlugin(input: PluginDefinitionInput): UniversalPluginManifest {
  return {
    id: input.id,
    name: input.name,
    version: input.version,
    description: input.description,
    type: input.type || 'integration',
    publisher: input.publisher || { name: 'Community Developer', verified: false },
    license: input.license || 'MIT',
    capabilities: input.capabilities || [],
    providers: input.providers ? input.providers.map(p => p.id) : (input.providers || []),
    permissions: input.permissions || {
      network: false,
      credentials: [],
      risk: { read: 'LOW', write: 'LOW' },
    },
    runtime: input.runtime || { type: 'process' },
    dependencies: input.dependencies || { plugins: [], providers: [], skills: [] },
    accounts: input.accounts || { supported: false, multiple: false },
    sandbox: input.sandbox || { required: true },
    certification: 'UNVERIFIED',
    enabled: true,
    isInstalled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function defineProvider<T extends Provider>(provider: T): T {
  return provider;
}
