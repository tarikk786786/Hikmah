import { ISandboxEnvironment, SandboxCommandResult } from './sandbox-executor.js';
import crypto from 'crypto';

export class DockerSandbox implements ISandboxEnvironment {
  public id: string;
  public status: 'STARTING' | 'READY' | 'RUNNING' | 'STOPPED' | 'ERROR' = 'STOPPED';
  
  private containerId?: string;
  private image: string;

  constructor(image: string = 'ubuntu:latest') {
    this.id = `sbx_${crypto.randomBytes(6).toString('hex')}`;
    this.image = image;
  }

  async start(): Promise<void> {
    this.status = 'STARTING';
    console.log(`[DockerSandbox] Starting container from image ${this.image}...`);
    // Simulated docker run
    this.containerId = crypto.randomBytes(12).toString('hex');
    this.status = 'READY';
    console.log(`[DockerSandbox] Sandbox ${this.id} ready (Container: ${this.containerId})`);
  }

  async stop(): Promise<void> {
    console.log(`[DockerSandbox] Stopping container ${this.containerId}...`);
    this.status = 'STOPPED';
  }

  async executeCommand(command: string, timeoutMs: number = 30000): Promise<SandboxCommandResult> {
    if (this.status !== 'READY' && this.status !== 'RUNNING') {
      throw new Error(`Sandbox ${this.id} is not ready`);
    }

    this.status = 'RUNNING';
    const start = Date.now();
    
    console.log(`[DockerSandbox] Executing inside container: ${command}`);
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.status = 'READY';
    
    return {
      exitCode: 0,
      stdout: `Simulated execution of: ${command}`,
      stderr: '',
      durationMs: Date.now() - start
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    console.log(`[DockerSandbox] Writing ${content.length} bytes to ${path}`);
  }

  async readFile(path: string): Promise<string> {
    console.log(`[DockerSandbox] Reading from ${path}`);
    return `Simulated content of ${path}`;
  }
}
