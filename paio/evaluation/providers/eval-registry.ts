import { IEvaluationProvider } from '../eval-executor.js';
import { DeepEvalAdapter } from './deepeval-adapter.js';
import { RagasAdapter } from './ragas-adapter.js';
import { PromptfooAdapter } from './promptfoo-adapter.js';

export class EvaluationRegistry {
  private static instance: EvaluationRegistry;
  private adapters: Map<string, IEvaluationProvider> = new Map();

  public static getInstance(): EvaluationRegistry {
    if (!EvaluationRegistry.instance) {
      EvaluationRegistry.instance = new EvaluationRegistry();
      EvaluationRegistry.instance.register(new DeepEvalAdapter());
      EvaluationRegistry.instance.register(new RagasAdapter());
      EvaluationRegistry.instance.register(new PromptfooAdapter());
    }
    return EvaluationRegistry.instance;
  }

  public register(adapter: IEvaluationProvider): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  public getAdapter(providerId: string): IEvaluationProvider | undefined {
    return this.adapters.get(providerId);
  }
}
