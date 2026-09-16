import { StorageManager } from '../../storage/storage-manager.js';

export interface TypedArtifact {
  artifactId: string;
  workflowId: string;
  taskId: string;
  type: 'research_report' | 'code_patch' | 'security_finding' | 'screenshot' | 'dataset' | 'document' | 'general';
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256: string;
  createdAt: string;
}

export class ArtifactBus {
  private static instance: ArtifactBus;
  private artifacts: Map<string, TypedArtifact> = new Map();
  private storageManager: StorageManager;

  constructor(storageManager?: StorageManager) {
    this.storageManager = storageManager || StorageManager.getInstance();
  }

  public static getInstance(): ArtifactBus {
    if (!ArtifactBus.instance) {
      ArtifactBus.instance = new ArtifactBus();
    }
    return ArtifactBus.instance;
  }

  /**
   * Publishes an artifact to Universal Storage and registers its reference
   */
  public async publishArtifact(options: {
    workflowId: string;
    taskId: string;
    type: TypedArtifact['type'];
    name: string;
    data: Buffer | string;
    mimeType?: string;
  }): Promise<TypedArtifact> {
    const artifactId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storageKey = `workflows/${options.workflowId}/${artifactId}_${options.name}`;
    const rawBuffer = Buffer.isBuffer(options.data) ? options.data : Buffer.from(options.data, 'utf-8');

    // Upload via StorageManager
    const stored = await this.storageManager.uploadFile(storageKey, rawBuffer, {
      mimeType: options.mimeType || 'text/plain'
    });

    const crypto = await import('crypto');
    const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    const artifact: TypedArtifact = {
      artifactId,
      workflowId: options.workflowId,
      taskId: options.taskId,
      type: options.type,
      name: options.name,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storageKey,
      sha256,
      createdAt: new Date().toISOString()
    };

    this.artifacts.set(artifactId, artifact);
    return artifact;
  }

  public getArtifact(artifactId: string): TypedArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  public async retrieveData(artifactId: string): Promise<Buffer> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Artifact [${artifactId}] not found on ArtifactBus`);
    }
    return this.storageManager.getFile(artifact.storageKey);
  }

  public listByWorkflow(workflowId: string): TypedArtifact[] {
    return Array.from(this.artifacts.values()).filter(a => a.workflowId === workflowId);
  }
}
