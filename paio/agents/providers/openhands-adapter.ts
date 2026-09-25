import { AIAgent } from '../../types/universal.js';
import { IAgentProvider, AgentExecutionRequest, AgentExecutionResult } from '../agent-executor.js';
import { DockerSandbox } from '../../sandbox/docker-sandbox.js';

/**
 * Adapter for OpenHands (formerly OpenDevin)
 * Represents Hikmah Canonical Layer ↓ Provider Adapter ↓ External Framework (OpenHands)
 */
export class OpenHandsAdapter implements IAgentProvider {
  public providerId = 'openhands';
  private sandbox: DockerSandbox | null = null;

  async initialize(): Promise<void> {
    console.log('[OpenHandsAdapter] Initializing secure coding sandbox connection...');
    this.sandbox = new DockerSandbox('ghcr.io/openhands/sandbox:latest');
    await this.sandbox.start();
  }

  async execute(agent: AIAgent, request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    if (!this.sandbox) throw new Error('Sandbox not initialized');

    console.log(`[OpenHandsAdapter] Delegating repository task ${request.taskId} to OpenHands Sandbox...`);
    
    // Simulate an OpenHands agent iteration
    const result = await this.sandbox.executeCommand(`bash -c "echo Executing task: ${request.instructions}"`);
    
    return {
      taskId: request.taskId,
      status: result.exitCode === 0 ? 'COMPLETED' : 'FAILED',
      output: `OpenHands execution trace:\n${result.stdout}`,
      metadata: {
        filesModified: 1,
        sandboxRuntime: 'docker',
        sandboxId: this.sandbox.id
      },
      usage: {
        promptTokens: 250,
        completionTokens: 110
      }
    };
  }
}
