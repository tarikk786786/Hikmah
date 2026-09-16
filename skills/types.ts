export type SkillPermission =
  | 'network'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'browser:control'
  | 'terminal:execute'
  | 'memory:read'
  | 'memory:write';

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  tools: string[];
  permissions: SkillPermission[];
  configuration?: Record<string, unknown>;
  enabled: boolean;
}
