import { createHash } from 'crypto';
import {
  ResearchMonitorJob,
  ResearchMonitorDiff,
  MonitorChangeType,
  FetchResult,
} from './types.js';
import { FetchRouter } from './fetch-router.js';
import { TrafilaturaExtractor } from './extraction-router.js';

export interface PageSnapshot {
  url: string;
  hash: string;
  extractedText: string;
  title: string;
  timestamp: string;
}

export class ResearchMonitorEngine {
  private fetchRouter: FetchRouter;
  private extractor: TrafilaturaExtractor;
  private jobs: Map<string, ResearchMonitorJob> = new Map();
  private snapshots: Map<string, Map<string, PageSnapshot>> = new Map(); // monitorId -> (url -> PageSnapshot)
  private diffHistory: Map<string, ResearchMonitorDiff[]> = new Map(); // monitorId -> diffs

  constructor(fetchRouter?: FetchRouter, extractor?: TrafilaturaExtractor) {
    this.fetchRouter = fetchRouter || new FetchRouter();
    this.extractor = extractor || new TrafilaturaExtractor();
  }

  public registerJob(job: ResearchMonitorJob): ResearchMonitorJob {
    const jobRecord = { ...job };
    this.jobs.set(job.id, jobRecord);
    if (!this.snapshots.has(job.id)) {
      this.snapshots.set(job.id, new Map());
    }
    if (!this.diffHistory.has(job.id)) {
      this.diffHistory.set(job.id, []);
    }
    return jobRecord;
  }

  public getJob(id: string): ResearchMonitorJob | undefined {
    return this.jobs.get(id);
  }

  public listJobs(userId?: string): ResearchMonitorJob[] {
    const all = Array.from(this.jobs.values());
    if (userId) {
      return all.filter((j) => j.userId === userId);
    }
    return all;
  }

  public deleteJob(id: string): boolean {
    this.snapshots.delete(id);
    this.diffHistory.delete(id);
    return this.jobs.delete(id);
  }

  public getDiffHistory(monitorId: string): ResearchMonitorDiff[] {
    return this.diffHistory.get(monitorId) || [];
  }

  public async checkMonitorJob(monitorId: string): Promise<ResearchMonitorDiff[]> {
    const job = this.jobs.get(monitorId);
    if (!job) {
      throw new Error(`Monitor job ${monitorId} not found`);
    }

    const now = new Date().toISOString();
    const currentSnapshots = this.snapshots.get(monitorId) || new Map<string, PageSnapshot>();
    const diffs: ResearchMonitorDiff[] = [];
    const seenUrls = new Set<string>();

    for (const targetUrl of job.targetUrls) {
      seenUrls.add(targetUrl);
      try {
        const fetchResult = await this.fetchRouter.fetch(targetUrl);
        const extracted = this.extractor.extract(fetchResult);
        const cleanText = extracted.extractedText || fetchResult.text || '';
        const currentHash = createHash('sha256').update(cleanText).digest('hex');

        const prevSnapshot = currentSnapshots.get(targetUrl);

        if (!prevSnapshot) {
          // Brand new URL tracked
          const diff: ResearchMonitorDiff = {
            id: `diff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            monitorId,
            detectedAt: now,
            changeType: 'NEW',
            url: targetUrl,
            title: extracted.title || targetUrl,
            newHash: currentHash,
            diffSummary: `Initial tracking snapshot created (${cleanText.length} characters captured).`,
            addedContent: cleanText ? [cleanText.slice(0, 300) + (cleanText.length > 300 ? '...' : '')] : [],
          };
          diffs.push(diff);
          currentSnapshots.set(targetUrl, {
            url: targetUrl,
            hash: currentHash,
            extractedText: cleanText,
            title: extracted.title || targetUrl,
            timestamp: now,
          });
        } else if (prevSnapshot.hash !== currentHash) {
          // Changed URL
          const diffSummary = this.summarizeDiff(prevSnapshot.extractedText, cleanText);
          const diff: ResearchMonitorDiff = {
            id: `diff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            monitorId,
            detectedAt: now,
            changeType: 'CHANGED',
            url: targetUrl,
            title: extracted.title || prevSnapshot.title,
            previousHash: prevSnapshot.hash,
            newHash: currentHash,
            diffSummary: diffSummary.summary,
            addedContent: diffSummary.added,
            removedContent: diffSummary.removed,
          };
          diffs.push(diff);
          currentSnapshots.set(targetUrl, {
            url: targetUrl,
            hash: currentHash,
            extractedText: cleanText,
            title: extracted.title || prevSnapshot.title,
            timestamp: now,
          });
        } else {
          // Unchanged
          const diff: ResearchMonitorDiff = {
            id: `diff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            monitorId,
            detectedAt: now,
            changeType: 'UNCHANGED',
            url: targetUrl,
            title: prevSnapshot.title,
            previousHash: prevSnapshot.hash,
            newHash: currentHash,
            diffSummary: 'No changes detected since last snapshot.',
          };
          diffs.push(diff);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        diffs.push({
          id: `diff_err_${Date.now()}`,
          monitorId,
          detectedAt: now,
          changeType: 'UNCHANGED',
          url: targetUrl,
          title: targetUrl,
          diffSummary: `Failed to fetch snapshot: ${errorMsg}`,
        });
      }
    }

    // Check for removed URLs if a URL was previously tracked but removed from job.targetUrls
    for (const [prevUrl, prevSnap] of currentSnapshots.entries()) {
      if (!seenUrls.has(prevUrl)) {
        diffs.push({
          id: `diff_rem_${Date.now()}`,
          monitorId,
          detectedAt: now,
          changeType: 'REMOVED',
          url: prevUrl,
          title: prevSnap.title,
          previousHash: prevSnap.hash,
          diffSummary: `Target URL removed from monitor tracking list.`,
        });
        currentSnapshots.delete(prevUrl);
      }
    }

    // Update job state
    job.lastRunAt = now;
    job.nextRunAt = new Date(Date.now() + job.frequencyMinutes * 60000).toISOString();
    this.jobs.set(monitorId, job);
    this.snapshots.set(monitorId, currentSnapshots);

    const history = this.diffHistory.get(monitorId) || [];
    history.push(...diffs);
    this.diffHistory.set(monitorId, history);

    return diffs;
  }

  private summarizeDiff(
    oldText: string,
    newText: string
  ): { summary: string; added: string[]; removed: string[] } {
    const oldLines = new Set(oldText.split('\n').map((l) => l.trim()).filter(Boolean));
    const newLines = new Set(newText.split('\n').map((l) => l.trim()).filter(Boolean));

    const added: string[] = [];
    const removed: string[] = [];

    for (const line of newLines) {
      if (!oldLines.has(line)) {
        added.push(line);
      }
    }

    for (const line of oldLines) {
      if (!newLines.has(line)) {
        removed.push(line);
      }
    }

    const summary = `Detected ${added.length} added segment(s) and ${removed.length} removed segment(s). Content length changed from ${oldText.length} to ${newText.length} characters.`;

    return {
      summary,
      added: added.slice(0, 5),
      removed: removed.slice(0, 5),
    };
  }
}
