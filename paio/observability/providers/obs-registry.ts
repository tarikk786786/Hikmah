import { IObservabilityProvider } from '../obs-executor.js';
import { OpenTelemetryAdapter } from './opentelemetry-adapter.js';
import { LangSmithAdapter } from './langsmith-adapter.js';

export class ObservabilityRegistry {
  private static instance: ObservabilityRegistry;
  private adapters: Map<string, IObservabilityProvider> = new Map();

  public static getInstance(): ObservabilityRegistry {
    if (!ObservabilityRegistry.instance) {
      ObservabilityRegistry.instance = new ObservabilityRegistry();
      ObservabilityRegistry.instance.register(new OpenTelemetryAdapter());
      ObservabilityRegistry.instance.register(new LangSmithAdapter());
    }
    return ObservabilityRegistry.instance;
  }

  public register(adapter: IObservabilityProvider): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  public getAdapter(providerId: string): IObservabilityProvider | undefined {
    return this.adapters.get(providerId);
  }
}
