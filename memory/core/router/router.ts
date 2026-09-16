import { v4 as uuidv4 } from 'uuid';
import {
  MemoryProvider,
  UnifiedMemoryRecord,
  MemoryWriteInput,
  MemoryQueryInput,
  MemoryTimelineQuery,
  MemoryRelatedQuery,
  MemoryContextPacket,
  MemoryProviderHealth,
  MemoryScope
} from '../types.js';
import { MemoryClassifier } from '../classifier/classifier.js';
import { SecretScanner } from '../privacy/secret-scanner.js';
import { PromptGuard } from '../policy/prompt-guard.js';
import { MemoryMerger } from '../merger/merger.js';
import { NativeSupabaseMemoryProvider } from '../../providers/native-supabase/provider.js';
import { Mem0Provider } from '../../providers/mem0/provider.js';
import { GraphitiProvider } from '../../providers/graphiti/provider.js';
import { LettaProvider } from '../../providers/letta/provider.js';
import { CogneeProvider } from '../../providers/cognee/provider.js';
import { LangMemProvider } from '../../providers/langmem/provider.js';
import { SupermemoryProvider } from '../../providers/supermemory/provider.js';

export interface CanonicalRegistryRecord {
  id: string;
  userId: string;
  projectId?: string;
  classification: string;
  canonicalHash: string;
  primaryProvider: string;
  authority: string;
  createdAt: string;
  updatedAt: string;
}

export class MemoryRouter {
  private static instance: MemoryRouter;

  private providers: Map<string, MemoryProvider> = new Map();
  private canonicalRegistry: Map<string, CanonicalRegistryRecord> = new Map(); // id -> CanonicalRegistryRecord
  private providerRefs: Map<string, Array<{ provider: string; providerRecordId: string }>> = new Map(); // id -> refs

  private classifier: MemoryClassifier;
  private secretScanner: SecretScanner;
  private promptGuard: PromptGuard;
  private merger: MemoryMerger;

  constructor(customProviders?: MemoryProvider[]) {
    this.classifier = MemoryClassifier.getInstance();
    this.secretScanner = SecretScanner.getInstance();
    this.promptGuard = PromptGuard.getInstance();
    this.merger = MemoryMerger.getInstance();

    if (customProviders && customProviders.length > 0) {
      for (const p of customProviders) {
        this.registerProvider(p);
      }
    } else {
      // Register standard ecosystem adapters
      this.registerProvider(new NativeSupabaseMemoryProvider());
      this.registerProvider(new Mem0Provider());
      this.registerProvider(new GraphitiProvider());
      this.registerProvider(new LettaProvider());
      this.registerProvider(new CogneeProvider());
      this.registerProvider(new LangMemProvider());
      this.registerProvider(new SupermemoryProvider());
    }
  }

  public static getInstance(): MemoryRouter {
    if (!MemoryRouter.instance) {
      MemoryRouter.instance = new MemoryRouter();
    }
    return MemoryRouter.instance;
  }

  public registerProvider(provider: MemoryProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): MemoryProvider | undefined {
    return this.providers.get(id);
  }

  public listProviders(): MemoryProvider[] {
    return Array.from(this.providers.values());
  }

  public async remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    // 1. Scan for secrets and redact credentials
    const secretScan = this.secretScanner.scan(input.content);
    const sanitizedContent = secretScan.redactedText;

    // 2. Classify memory if not explicitly declared
    const classification = input.classification || this.classifier.classifyContent(sanitizedContent);

    // 3. Determine target provider
    const targetProviderId = input.targetProvider || this.classifier.selectTargetProvider(classification);
    let provider = this.providers.get(targetProviderId);

    // Fall back to native-supabase if specialized provider is unavailable
    if (!provider) {
      provider = this.providers.get('native-supabase')!;
    }

    const writePayload: MemoryWriteInput = {
      ...input,
      content: sanitizedContent,
      classification
    };

    let record: UnifiedMemoryRecord;
    try {
      record = await provider.remember(writePayload);
    } catch (err) {
      console.warn(`Provider [${targetProviderId}] failed to store memory. Falling back to native-supabase:`, err);
      const fallback = this.providers.get('native-supabase')!;
      record = await fallback.remember(writePayload);
    }

    // 4. Update Canonical Memory Registry
    const canonicalHash = this.merger.generateContentHash(record.content);
    this.canonicalRegistry.set(record.id, {
      id: record.id,
      userId: record.userId,
      projectId: record.projectId,
      classification: record.classification,
      canonicalHash,
      primaryProvider: record.provider,
      authority: record.authority,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });

    const existingRefs = this.providerRefs.get(record.id) || [];
    existingRefs.push({
      provider: record.provider,
      providerRecordId: record.providerRecordId || record.id
    });
    this.providerRefs.set(record.id, existingRefs);

    return record;
  }

  public async recall(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    return this.search(query);
  }

  public async search(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    const intent = this.classifier.classifyQuery(query.queryText);

    // Determine target providers to consult
    const candidateProviders: MemoryProvider[] = [];

    if (query.targetProvider && this.providers.has(query.targetProvider)) {
      candidateProviders.push(this.providers.get(query.targetProvider)!);
    } else {
      // Select best provider based on query intent + always consult native-supabase fallback
      switch (intent) {
        case 'PREFERENCE':
          if (this.providers.has('mem0')) candidateProviders.push(this.providers.get('mem0')!);
          break;
        case 'TIMELINE':
        case 'HISTORY':
          if (this.providers.has('graphiti')) candidateProviders.push(this.providers.get('graphiti')!);
          break;
        case 'RELATIONSHIP':
          if (this.providers.has('cognee')) candidateProviders.push(this.providers.get('cognee')!);
          break;
        case 'PROCEDURE':
          if (this.providers.has('langmem')) candidateProviders.push(this.providers.get('langmem')!);
          break;
        case 'DOCUMENT':
          if (this.providers.has('supermemory')) candidateProviders.push(this.providers.get('supermemory')!);
          break;
        case 'AGENT':
          if (this.providers.has('letta')) candidateProviders.push(this.providers.get('letta')!);
          break;
      }

      // Always query native provider for baseline persistence
      const native = this.providers.get('native-supabase');
      if (native && !candidateProviders.includes(native)) {
        candidateProviders.push(native);
      }
    }

    const promises = candidateProviders.map(async (p) => {
      try {
        return await p.search(query);
      } catch (err) {
        console.warn(`Search failed on provider [${p.id}], skipping:`, err);
        return [];
      }
    });

    const nestedResults = await Promise.all(promises);
    const combined = nestedResults.flat();

    // Deduplicate and rank
    return this.merger.rankAndSelect(combined, query.limit || 10);
  }

  public async timeline(query: MemoryTimelineQuery): Promise<UnifiedMemoryRecord[]> {
    const candidateProviders: MemoryProvider[] = [];
    if (this.providers.has('graphiti')) candidateProviders.push(this.providers.get('graphiti')!);
    if (this.providers.has('native-supabase')) candidateProviders.push(this.providers.get('native-supabase')!);

    const promises = candidateProviders.map(async (p) => {
      if (p.timeline) {
        try {
          return await p.timeline(query);
        } catch {
          return [];
        }
      }
      return [];
    });

    const nested = await Promise.all(promises);
    const flat = nested.flat();
    flat.sort((a, b) => new Date(b.validFrom || b.createdAt).getTime() - new Date(a.validFrom || a.createdAt).getTime());
    return this.merger.deduplicate(flat).slice(0, query.limit || 20);
  }

  public async related(query: MemoryRelatedQuery): Promise<UnifiedMemoryRecord[]> {
    const candidateProviders: MemoryProvider[] = [];
    if (this.providers.has('cognee')) candidateProviders.push(this.providers.get('cognee')!);
    if (this.providers.has('graphiti')) candidateProviders.push(this.providers.get('graphiti')!);
    if (this.providers.has('native-supabase')) candidateProviders.push(this.providers.get('native-supabase')!);

    const promises = candidateProviders.map(async (p) => {
      if (p.related) {
        try {
          return await p.related(query);
        } catch {
          return [];
        }
      }
      return [];
    });

    const nested = await Promise.all(promises);
    return this.merger.deduplicate(nested.flat()).slice(0, query.limit || 10);
  }

  public async learn(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    return this.remember({
      ...input,
      classification: 'PROCEDURAL',
      targetProvider: 'langmem'
    });
  }

  public async forget(id: string): Promise<boolean> {
    let anyDeleted = false;

    // Delete across all provider refs
    const refs = this.providerRefs.get(id);
    if (refs) {
      for (const ref of refs) {
        const p = this.providers.get(ref.provider);
        if (p) {
          try {
            await p.forget(ref.providerRecordId);
            anyDeleted = true;
          } catch {}
        }
      }
    }

    // Direct delete check across all providers
    for (const p of this.providers.values()) {
      try {
        const del = await p.forget(id);
        if (del) anyDeleted = true;
      } catch {}
    }

    this.canonicalRegistry.delete(id);
    this.providerRefs.delete(id);

    return anyDeleted;
  }

  public async consolidate(scope: MemoryScope, userId: string, projectId?: string): Promise<{ consolidatedCount: number }> {
    let count = 0;
    for (const p of this.providers.values()) {
      if (p.consolidate) {
        try {
          const res = await p.consolidate(scope, userId, projectId);
          count += res.consolidatedCount;
        } catch {}
      }
    }
    return { consolidatedCount: count };
  }

  public async retrieve_context(query: MemoryQueryInput): Promise<MemoryContextPacket> {
    const rawMemories = await this.search({ ...query, limit: 15 });

    const facts: UnifiedMemoryRecord[] = [];
    const preferences: UnifiedMemoryRecord[] = [];
    const history: UnifiedMemoryRecord[] = [];
    const relationships: UnifiedMemoryRecord[] = [];
    const documents: UnifiedMemoryRecord[] = [];
    const procedures: UnifiedMemoryRecord[] = [];
    const agentState: UnifiedMemoryRecord[] = [];

    for (const m of rawMemories) {
      switch (m.classification) {
        case 'PREFERENCE':
        case 'USER':
          preferences.push(m);
          break;
        case 'TEMPORAL':
        case 'EVENT':
          history.push(m);
          break;
        case 'RELATIONSHIP':
        case 'ENTITY':
          relationships.push(m);
          break;
        case 'DOCUMENT':
          documents.push(m);
          break;
        case 'PROCEDURAL':
          procedures.push(m);
          break;
        case 'AGENT':
        case 'WORKING':
          agentState.push(m);
          break;
        default:
          facts.push(m);
          break;
      }
    }

    const formattedContext = this.promptGuard.frameMemoryContext(rawMemories);

    return {
      facts,
      preferences,
      history,
      relationships,
      documents,
      procedures,
      agentState,
      formattedContext
    };
  }

  public explain(id: string): {
    id: string;
    found: boolean;
    canonical?: CanonicalRegistryRecord;
    providerDetails?: Array<{ provider: string; providerRecordId: string }>;
  } {
    const canonical = this.canonicalRegistry.get(id);
    const providerDetails = this.providerRefs.get(id);

    return {
      id,
      found: !!canonical,
      canonical,
      providerDetails
    };
  }

  public async healthCheckAll(): Promise<MemoryProviderHealth[]> {
    const checks = Array.from(this.providers.values()).map(async (p) => {
      try {
        return await p.healthCheck();
      } catch (err) {
        return {
          provider: p.id,
          status: 'OFFLINE' as const,
          latencyMs: -1,
          recordCount: 0,
          lastCheckedAt: new Date().toISOString(),
          error: (err as Error).message
        };
      }
    });

    return Promise.all(checks);
  }
}
