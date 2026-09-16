import { Capability, RuntimeTarget } from '../capabilities/types.js';

export interface TaskRequirements {
  estimatedDurationMs: number;
  requiresBrowser?: boolean;
  requiresDockerSandbox?: boolean;
  requiresHeavyCompute?: boolean;
  requiresDatabaseLocality?: boolean;
  isInteractiveChat?: boolean;
}

export class RuntimeRouter {
  public selectRuntime(capability: Capability, requirements?: TaskRequirements): RuntimeTarget {
    // If the capability explicitly hardcodes an isolated container runtime
    if (capability.runtime === 'DOCKER' || requirements?.requiresDockerSandbox) {
      return 'DOCKER';
    }

    // Playwright / Browser tasks MUST execute on Render or Docker worker (never Vercel)
    if (capability.category === 'browser' || requirements?.requiresBrowser) {
      return 'RENDER';
    }

    // Heavy long-running tasks (> 30s) exceed Vercel serverless thresholds
    if ((requirements?.estimatedDurationMs && requirements.estimatedDurationMs > 25000) || capability.timeout > 25000) {
      return 'RENDER';
    }

    // Deep research / multi-page crawling
    if (capability.category === 'research' || requirements?.requiresHeavyCompute) {
      return 'RENDER';
    }

    // Database / vector native computation
    if (capability.category === 'database' && requirements?.requiresDatabaseLocality) {
      return 'SUPABASE_EDGE';
    }

    // Lightweight instant operations (< 5s) execute directly on Vercel control plane
    if (capability.timeout <= 15000 && !requirements?.requiresBrowser && !requirements?.requiresDockerSandbox) {
      return 'VERCEL';
    }

    // Default fallback to Render worker
    return 'RENDER';
  }
}
