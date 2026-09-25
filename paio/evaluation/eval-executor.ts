/**
 * Canonical Evaluation Interface for Hikmah
 */
export interface EvaluationContext {
  systemPrompt: string;
  userPrompt: string;
  assistantOutput: string;
  expectedOutput?: string;
  toolsUsed?: string[];
}

export interface EvaluationResult {
  providerId: string;
  metric: string;
  score: number;        // 0.0 to 1.0
  passed: boolean;
  feedback: string;
}

export interface IEvaluationProvider {
  providerId: string;
  
  initialize(): Promise<void>;
  
  /**
   * Run an evaluation on a completed AI task/inference
   */
  evaluate(context: EvaluationContext, metrics: string[]): Promise<EvaluationResult[]>;
}
