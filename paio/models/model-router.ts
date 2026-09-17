import { AIModel } from '../types/universal';

export class ModelRouter {
  private static instance: ModelRouter;
  private models: Map<string, AIModel> = new Map();

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  public registerModel(model: AIModel): void {
    this.models.set(model.id, model);
  }

  public routeTask(params: {
    taskType: string;
    requiresVision?: boolean;
    costConstraint?: 'low' | 'medium' | 'high';
    privacyMode?: 'public' | 'private' | 'offline';
  }): AIModel | null {
    // Simple cascade logic for intelligent model routing
    const available = Array.from(this.models.values());
    
    let candidates = available;
    
    if (params.privacyMode === 'offline') {
      // Must use local models
      candidates = candidates.filter(m => m.providerId === 'local_ollama' || m.providerId === 'local_vllm');
    }

    if (params.requiresVision) {
      candidates = candidates.filter(m => m.capabilities.includes('vision'));
    }

    if (candidates.length === 0) return null;

    // Sort by cost if required
    if (params.costConstraint === 'low') {
      candidates.sort((a, b) => (a.costPer1kTokens || 0) - (b.costPer1kTokens || 0));
    } else {
      // Default: sort by capability (simplified as context window size here)
      candidates.sort((a, b) => (b.contextWindow || 0) - (a.contextWindow || 0));
    }

    return candidates[0];
  }
}
