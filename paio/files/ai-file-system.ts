import crypto from 'crypto';
import path from 'path';
import { AISystemBus } from '../events/ai-system-bus';

export interface SemanticFileEntry {
  id: string;
  name: string;
  path: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  projectId?: string;
  tags: string[];
  summary?: string;
  contentPreview?: string;
  metadata: Record<string, unknown>;
  indexedAt: string;
  updatedAt: string;
}

export class AIFileSystem {
  private static instance: AIFileSystem;
  private indexedFiles: Map<string, SemanticFileEntry> = new Map();
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedWorkspaceFiles();
  }

  public static getInstance(): AIFileSystem {
    if (!AIFileSystem.instance) {
      AIFileSystem.instance = new AIFileSystem();
    }
    return AIFileSystem.instance;
  }

  private seedWorkspaceFiles(): void {
    const defaultFiles = [
      {
        name: 'package.json',
        path: 'c:/Users/tarik/Downloads/my assistant ai/package.json',
        extension: '.json',
        sizeBytes: 4096,
        mimeType: 'application/json',
        projectId: 'proj_hikmah_core',
        tags: ['config', 'node', 'workspace'],
        summary: 'Root package manifest declaring dependencies and workspace scripts for Hikmah AI OS.',
      },
      {
        name: 'implementation_plan.md',
        path: 'c:/Users/tarik/Downloads/my assistant ai/implementation_plan.md',
        extension: '.md',
        sizeBytes: 8192,
        mimeType: 'text/markdown',
        projectId: 'proj_hikmah_core',
        tags: ['plan', 'architecture', 'step-25', 'paios'],
        summary: 'Implementation plan for Step 25 Personal AI Operating System.',
      },
    ];

    for (const f of defaultFiles) {
      const id = `file_${crypto.randomBytes(6).toString('hex')}`;
      this.indexedFiles.set(id, {
        ...f,
        id,
        metadata: {},
        indexedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  public indexFile(params: {
    name: string;
    path: string;
    sizeBytes: number;
    mimeType?: string;
    projectId?: string;
    tags?: string[];
    contentPreview?: string;
    summary?: string;
  }): SemanticFileEntry {
    const id = `file_${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(params.name).toLowerCase();
    const entry: SemanticFileEntry = {
      id,
      name: params.name,
      path: params.path,
      extension: ext,
      sizeBytes: params.sizeBytes,
      mimeType: params.mimeType || 'application/octet-stream',
      projectId: params.projectId,
      tags: params.tags || [],
      contentPreview: params.contentPreview,
      summary: params.summary || `File ${params.name}`,
      metadata: {},
      indexedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.indexedFiles.set(id, entry);
    this.bus.emit({
      type: 'files.indexed',
      source: 'AIFileSystem',
      projectId: entry.projectId,
      data: { fileId: id, name: entry.name, path: entry.path },
    });

    return entry;
  }

  public searchFiles(query: string, options?: { projectId?: string; tag?: string; limit?: number }): SemanticFileEntry[] {
    const q = query.toLowerCase().trim();
    let matches = Array.from(this.indexedFiles.values());

    if (options?.projectId) {
      matches = matches.filter(f => f.projectId === options.projectId);
    }
    if (options?.tag) {
      matches = matches.filter(f => f.tags.includes(options.tag!));
    }

    if (q) {
      matches = matches.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.summary && f.summary.toLowerCase().includes(q)) ||
        (f.contentPreview && f.contentPreview.toLowerCase().includes(q)) ||
        f.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return matches.slice(0, options?.limit || 20);
  }

  public getFile(id: string): SemanticFileEntry | undefined {
    return this.indexedFiles.get(id);
  }

  public listFilesByProject(projectId: string): SemanticFileEntry[] {
    return Array.from(this.indexedFiles.values()).filter(f => f.projectId === projectId);
  }
}
