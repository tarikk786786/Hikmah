import fs from 'fs';
import path from 'path';
import { FrontmatterParser } from './frontmatter.js';

export interface NoteDocument {
  id: string; // The relative file path (e.g. "Concepts/AI.md")
  basename: string; // "AI"
  properties: Record<string, any>;
  content: string;
  backlinks: string[]; // Files that link TO this note
  outlinks: string[];  // Files that this note links TO
  lastModified: number;
}

/**
 * Obsidian-emulated Vault Engine for Hikmah Canonical Knowledge Base.
 * Supports Markdown storage, Properties, Daily Notes, and Backlinks.
 */
export class VaultEngine {
  private vaultPath: string;
  private graph: Map<string, NoteDocument> = new Map();
  private initialized = false;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    if (!fs.existsSync(this.vaultPath)) {
      fs.mkdirSync(this.vaultPath, { recursive: true });
    }
  }

  public async initialize(): Promise<void> {
    console.log(`[VaultEngine] Initializing vault at ${this.vaultPath}`);
    this.graph.clear();
    await this.scanDirectory(this.vaultPath);
    this.recomputeBacklinks();
    this.initialized = true;
    console.log(`[VaultEngine] Vault indexed. ${this.graph.size} notes found.`);
  }

  private async scanDirectory(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip hidden folders (e.g., .obsidian, .git)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.md')) {
          await this.processFile(fullPath);
        } else if (entry.name.endsWith('.canvas')) {
          await this.processCanvas(fullPath);
        }
      }
    }
  }

  private async processCanvas(fullPath: string): Promise<void> {
    const relPath = path.relative(this.vaultPath, fullPath).replace(/\\/g, '/');
    const basename = path.basename(relPath, '.canvas');
    const rawContent = await fs.promises.readFile(fullPath, 'utf-8');
    const stat = await fs.promises.stat(fullPath);
    
    let parsedJson: any = {};
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      // invalid canvas
    }

    this.graph.set(relPath, {
      id: relPath,
      basename,
      properties: { type: 'canvas' },
      content: rawContent, // raw JSON
      outlinks: [], // could extract links from canvas nodes later
      backlinks: [],
      lastModified: stat.mtimeMs
    });
  }

  private async processFile(fullPath: string): Promise<void> {
    const relPath = path.relative(this.vaultPath, fullPath).replace(/\\/g, '/');
    const basename = path.basename(relPath, '.md');
    const rawContent = await fs.promises.readFile(fullPath, 'utf-8');
    const stat = await fs.promises.stat(fullPath);
    
    const parsed = FrontmatterParser.parse(rawContent);
    const outlinks = this.extractWikilinks(parsed.content);

    this.graph.set(relPath, {
      id: relPath,
      basename,
      properties: parsed.properties,
      content: parsed.content,
      outlinks,
      backlinks: [], // Computed later
      lastModified: stat.mtimeMs
    });
  }

  private extractWikilinks(content: string): string[] {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      // Handle aliases [[Target|Alias]]
      const target = match[1].split('|')[0].trim();
      links.push(target);
    }
    return links;
  }

  private recomputeBacklinks(): void {
    // Reset backlinks
    for (const note of this.graph.values()) {
      note.backlinks = [];
    }

    // Populate backlinks
    for (const [sourcePath, note] of this.graph.entries()) {
      for (const outlink of note.outlinks) {
        // Find the target note (could be linked by exact path or basename)
        const targetNote = Array.from(this.graph.values()).find(
          n => n.basename === outlink || n.id === outlink || n.id === `${outlink}.md`
        );
        if (targetNote) {
          targetNote.backlinks.push(sourcePath);
        }
      }
    }
  }

  public getDailyNotePath(date: Date = new Date()): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const dailyFolder = path.join(this.vaultPath, 'Daily Notes');
    if (!fs.existsSync(dailyFolder)) {
      fs.mkdirSync(dailyFolder, { recursive: true });
    }
    
    return path.join('Daily Notes', `${dateStr}.md`).replace(/\\/g, '/');
  }

  public async getOrCreateDailyNote(): Promise<NoteDocument> {
    const relPath = this.getDailyNotePath();
    if (this.graph.has(relPath)) {
      return this.graph.get(relPath)!;
    }

    // Create it
    const initialProps = {
      type: 'daily_note',
      date: new Date().toISOString().split('T')[0],
      tags: ['daily']
    };
    
    return this.writeNote(relPath, '# Daily Log\n', initialProps);
  }

  public async writeNote(relPath: string, content: string, properties: Record<string, any> = {}): Promise<NoteDocument> {
    const fullPath = path.join(this.vaultPath, relPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized = FrontmatterParser.stringify(properties, content);
    await fs.promises.writeFile(fullPath, serialized, 'utf-8');

    // Update in-memory graph
    await this.processFile(fullPath);
    this.recomputeBacklinks();
    
    return this.graph.get(relPath)!;
  }

  public async writeCanvas(relPath: string, nodes: any[], edges: any[]): Promise<NoteDocument> {
    const fullPath = path.join(this.vaultPath, relPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify({ nodes, edges }, null, 2);
    await fs.promises.writeFile(fullPath, content, 'utf-8');

    await this.processCanvas(fullPath);
    this.recomputeBacklinks();
    
    return this.graph.get(relPath)!;
  }

  public getNote(relPathOrBasename: string): NoteDocument | undefined {
    // Try exact path
    if (this.graph.has(relPathOrBasename)) return this.graph.get(relPathOrBasename);
    if (this.graph.has(`${relPathOrBasename}.md`)) return this.graph.get(`${relPathOrBasename}.md`);
    
    // Try basename match
    return Array.from(this.graph.values()).find(n => n.basename === relPathOrBasename);
  }

  public search(query: string): NoteDocument[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.graph.values()).filter(note => {
      // Search content, properties, and filename
      if (note.basename.toLowerCase().includes(lowerQuery)) return true;
      if (note.content.toLowerCase().includes(lowerQuery)) return true;
      if (note.properties.tags && Array.isArray(note.properties.tags)) {
        if (note.properties.tags.some(t => String(t).toLowerCase().includes(lowerQuery))) return true;
      }
      return false;
    });
  }

  public getVaultMap(): NoteDocument[] {
    return Array.from(this.graph.values());
  }
}
