/**
 * Canonical Sandbox Interface for Hikmah
 * Provides secure execution environments for autonomous agents.
 */

export interface SandboxCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ISandboxEnvironment {
  id: string;
  status: 'STARTING' | 'READY' | 'RUNNING' | 'STOPPED' | 'ERROR';
  
  /**
   * Start the sandbox environment
   */
  start(): Promise<void>;
  
  /**
   * Stop and cleanup the sandbox
   */
  stop(): Promise<void>;
  
  /**
   * Execute a command within the sandbox
   */
  executeCommand(command: string, timeoutMs?: number): Promise<SandboxCommandResult>;
  
  /**
   * Write a file to the sandbox filesystem
   */
  writeFile(path: string, content: string): Promise<void>;
  
  /**
   * Read a file from the sandbox filesystem
   */
  readFile(path: string): Promise<string>;
}
