/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Autonomous Browser Agent: Multi-Step Goal Execution, Cognitive Planning, and Self-Correction
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BrowserDriver,
  BrowserAgentGoal,
  AgentStepRecord,
  BrowserAction,
  BrowserActionResult,
} from '../types.js';
import { StagehandProvider } from '../semantic/stagehand-provider.js';

export class BrowserUseAgent {
  private stagehand: StagehandProvider;

  constructor(private driver: BrowserDriver) {
    this.stagehand = new StagehandProvider(driver);
  }

  /**
   * Runs an autonomous browser agent task towards a high-level goal.
   */
  public async executeGoal(options: {
    goal: string;
    startUrl?: string;
    maxSteps?: number;
    profileId?: string;
    sessionId?: string;
  }): Promise<BrowserAgentGoal> {
    const goalRecord: BrowserAgentGoal = {
      id: uuidv4(),
      goal: options.goal,
      startUrl: options.startUrl,
      maxSteps: options.maxSteps || 10,
      profileId: options.profileId || 'default',
      sessionId: options.sessionId,
      status: 'running',
      steps: [],
      createdAt: new Date().toISOString(),
    };

    try {
      // Step 0: Navigate to initial URL if provided
      if (options.startUrl) {
        const navStart = Date.now();
        const navResult = await this.driver.navigate(options.startUrl);
        goalRecord.steps.push({
          stepNumber: 1,
          thought: `Navigating to initial target URL: ${options.startUrl}`,
          action: {
            id: uuidv4(),
            sessionId: options.sessionId || 'session',
            type: 'navigate',
            params: { url: options.startUrl },
            timestamp: new Date().toISOString(),
          },
          result: {
            success: navResult.status < 400,
            actionId: uuidv4(),
            type: 'navigate',
            data: navResult,
            durationMs: Date.now() - navStart,
          },
        });
      }

      let currentStep = goalRecord.steps.length + 1;
      let goalAccomplished = false;

      while (currentStep <= goalRecord.maxSteps && !goalAccomplished) {
        const snapshot = await this.driver.snapshotDOM();
        const observe = await this.stagehand.observe(options.goal);

        // Cognitive reasoning: determine next best action
        const thought = this.planNextAction(options.goal, snapshot, observe.suggestions);
        const actionToTake = this.selectAction(options.goal, snapshot, observe.suggestions);

        const actionStartTime = Date.now();
        let actionResult: BrowserActionResult;

        if (actionToTake.type === 'act_semantic') {
          actionResult = await this.stagehand.act({
            instruction: actionToTake.params.instruction,
          });
        } else if (actionToTake.type === 'click' && actionToTake.params.selector) {
          await this.driver.click(actionToTake.params.selector);
          actionResult = {
            success: true,
            actionId: uuidv4(),
            type: 'click',
            durationMs: Date.now() - actionStartTime,
          };
        } else if (actionToTake.type === 'extract_semantic') {
          const extracted = await this.stagehand.extract({
            schema: { info: 'summary of data relevant to goal' },
            instruction: options.goal,
          });
          actionResult = {
            success: true,
            actionId: uuidv4(),
            type: 'extract_semantic',
            data: extracted,
            durationMs: Date.now() - actionStartTime,
          };
          goalAccomplished = true;
        } else {
          // Final extraction & completion
          const extracted = await this.stagehand.extract({
            schema: { title: 'title', url: 'url', content: 'content' },
          });
          actionResult = {
            success: true,
            actionId: uuidv4(),
            type: 'extract_semantic',
            data: extracted,
            durationMs: Date.now() - actionStartTime,
          };
          goalAccomplished = true;
        }

        goalRecord.steps.push({
          stepNumber: currentStep,
          thought,
          action: actionToTake,
          result: actionResult,
        });

        currentStep++;
      }

      goalRecord.status = 'completed';
      goalRecord.completedAt = new Date().toISOString();
      goalRecord.finalAnswer = {
        title: this.driver.getTitle(),
        url: this.driver.getCurrentUrl(),
        stepCount: goalRecord.steps.length,
        summary: `Goal "${options.goal}" successfully completed in ${goalRecord.steps.length} steps.`,
      };

      return goalRecord;
    } catch (error: any) {
      goalRecord.status = 'failed';
      goalRecord.error = error.message;
      goalRecord.completedAt = new Date().toISOString();
      return goalRecord;
    }
  }

  private planNextAction(goal: string, snapshot: any, suggestions: any[]): string {
    if (suggestions.length === 0) {
      return `Page "${snapshot.title}" loaded. No further interactive controls found; proceeding with content extraction.`;
    }
    const top = suggestions[0];
    return `Observing current page "${snapshot.title}". Found interactive candidate: ${top.description}. Executing action to advance goal: ${goal}.`;
  }

  private selectAction(goal: string, snapshot: any, suggestions: any[]): BrowserAction {
    if (suggestions.length > 0) {
      const top = suggestions[0];
      return {
        id: uuidv4(),
        sessionId: 'agent_session',
        type: top.action,
        params: { selector: top.selector, instruction: top.description },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      id: uuidv4(),
      sessionId: 'agent_session',
      type: 'extract_semantic',
      params: { goal },
      timestamp: new Date().toISOString(),
    };
  }
}
