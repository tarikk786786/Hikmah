import { AISystemBus } from '../../events/ai-system-bus.js';
import { JobQueue } from '../../jobs/job-queue.js';
import { AgentExecutionResult } from '../agent-executor.js';

export interface A2AMessage {
  messageId: string;
  sourceAgentId: string;
  targetAgentId: string;
  type: 'REQUEST' | 'RESPONSE' | 'DELEGATE' | 'HANDOFF' | 'INFO';
  payload: any;
  replyToMessageId?: string;
  timestamp: number;
}

export class A2ABroker {
  private static instance: A2ABroker;
  private messageLog: A2AMessage[] = [];
  private bus = AISystemBus.getInstance();
  private jobs = JobQueue.getInstance();
  private pendingRequests = new Map<string, (result: any) => void>();

  private constructor() {
    this.bus.subscribe((event) => {
      if (event.type === 'job.completed') {
        this.handleJobCompleted(event);
      } else if (event.type === 'job.failed') {
        this.handleJobFailed(event);
      }
    });
  }

  public static getInstance(): A2ABroker {
    if (!A2ABroker.instance) {
      A2ABroker.instance = new A2ABroker();
    }
    return A2ABroker.instance;
  }

  /**
   * Send a message from one agent to another.
   * If it's a DELEGATE request, it automatically enqueues a job for the target agent.
   */
  public async sendMessage(message: Omit<A2AMessage, 'messageId' | 'timestamp'>): Promise<A2AMessage> {
    const fullMessage: A2AMessage = {
      ...message,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
      timestamp: Date.now()
    };

    this.messageLog.push(fullMessage);
    console.log(`[A2ABroker] Message routed: [${fullMessage.type}] ${fullMessage.sourceAgentId} -> ${fullMessage.targetAgentId}`);

    if (fullMessage.type === 'DELEGATE' || fullMessage.type === 'REQUEST') {
      // Spawn target agent as a background job
      const jobId = await this.jobs.enqueue('agent_task', {
        taskId: fullMessage.messageId,
        agentId: fullMessage.targetAgentId,
        instructions: fullMessage.payload,
        replyTo: fullMessage.sourceAgentId
      }, 'high');

      // If the source agent wants to wait for the response natively:
      return fullMessage;
    }

    return fullMessage;
  }

  /**
   * Block and wait for a response to a specific DELEGATE or REQUEST message.
   */
  public waitForResponse(messageId: string, timeoutMs: number = 60000): Promise<AgentExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`A2ABroker timeout waiting for response to ${messageId}`));
      }, timeoutMs);

      this.pendingRequests.set(messageId, (result: AgentExecutionResult) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  private handleJobCompleted(event: any) {
    if (event.data.name !== 'agent_task') return;
    
    // The job result should be an AgentExecutionResult
    const job = this.jobs.getJob(event.data.jobId);
    if (!job || !job.result) return;

    // Check if this job was a delegated task (taskId equals the original messageId)
    const originalMessageId = job.payload.taskId;
    const pendingResolver = this.pendingRequests.get(originalMessageId);
    
    if (pendingResolver) {
      console.log(`[A2ABroker] Resolving pending request for message ${originalMessageId}`);
      this.pendingRequests.delete(originalMessageId);
      pendingResolver(job.result);
    }
  }

  private handleJobFailed(event: any) {
    if (event.data.name !== 'agent_task') return;
    
    const job = this.jobs.getJob(event.data.jobId);
    if (!job) return;

    const originalMessageId = job.payload.taskId;
    const pendingResolver = this.pendingRequests.get(originalMessageId);
    
    if (pendingResolver) {
      this.pendingRequests.delete(originalMessageId);
      // Return a failed execution result instead of throwing an unhandled rejection
      pendingResolver({
        taskId: originalMessageId,
        status: 'FAILED',
        output: `Agent execution failed: ${job.error}`,
        metadata: { a2aError: true },
        usage: { promptTokens: 0, completionTokens: 0 }
      } as AgentExecutionResult);
    }
  }

  public getMessageHistory(agentId: string): A2AMessage[] {
    return this.messageLog.filter(m => m.sourceAgentId === agentId || m.targetAgentId === agentId);
  }
}
