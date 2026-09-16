import { SearchIntent } from './types.js';

export interface PlannedQuery {
  queryId: string;
  query: string;
  intent: SearchIntent;
  purpose: string;
  weight: number;
}

export class QueryPlanner {
  public plan(question: string, mode?: string): PlannedQuery[] {
    const queries = QueryPlanner.planQueries(question);
    if (mode === 'QUICK') {
      return queries.slice(0, 2);
    }
    return queries;
  }

  /**
   * Decomposes a user question into a multi-angle query plan.
   */
  public static planQueries(question: string): PlannedQuery[] {
    const clean = question.trim();
    const queries: PlannedQuery[] = [];
    const now = Date.now();

    // 1. Primary Base Query
    queries.push({
      queryId: `qry_${now}_1`,
      query: clean,
      intent: QueryPlanner.detectPrimaryIntent(clean),
      purpose: 'Core factual exploration',
      weight: 1.0
    });

    const lower = clean.toLowerCase();

    // 2. Technical / Implementation Query if technical keywords detected
    if (
      lower.includes('architecture') ||
      lower.includes('code') ||
      lower.includes('engine') ||
      lower.includes('api') ||
      lower.includes('protocol') ||
      lower.includes('typescript') ||
      lower.includes('database') ||
      lower.includes('system')
    ) {
      queries.push({
        queryId: `qry_${now}_2`,
        query: `${clean} technical specification architecture documentation`,
        intent: 'TECHNICAL',
        purpose: 'Technical deep-dive and architectural documentation',
        weight: 0.9
      });
    }

    // 3. Academic / Research Paper Query
    if (
      lower.includes('paper') ||
      lower.includes('research') ||
      lower.includes('study') ||
      lower.includes('benchmark') ||
      lower.includes('evaluation') ||
      lower.includes('llm') ||
      lower.includes('model')
    ) {
      queries.push({
        queryId: `qry_${now}_3`,
        query: `${clean} arxiv academic paper benchmark`,
        intent: 'ACADEMIC',
        purpose: 'Peer-reviewed literature and empirical benchmark metrics',
        weight: 0.85
      });
    }

    // 4. News / Recent developments
    if (
      lower.includes('latest') ||
      lower.includes('news') ||
      lower.includes('2025') ||
      lower.includes('2026') ||
      lower.includes('recent') ||
      lower.includes('update')
    ) {
      queries.push({
        queryId: `qry_${now}_4`,
        query: `${clean} latest news developments`,
        intent: 'NEWS',
        purpose: 'Recent developments and timeline updates',
        weight: 0.8
      });
    }

    // 5. GitHub / Open Source Repositories
    if (
      lower.includes('github') ||
      lower.includes('open source') ||
      lower.includes('library') ||
      lower.includes('repo') ||
      lower.includes('tool') ||
      lower.includes('sdk')
    ) {
      queries.push({
        queryId: `qry_${now}_5`,
        query: `${clean} site:github.com repository`,
        intent: 'GITHUB',
        purpose: 'Open-source repository analysis and code implementation',
        weight: 0.8
      });
    }

    // 6. Adversarial / Conflict / Criticism Query
    queries.push({
      queryId: `qry_${now}_6`,
      query: `${clean} criticism limitations problems disadvantages`,
      intent: 'GENERAL',
      purpose: 'Identifying counter-claims, edge-cases, and critical limitations',
      weight: 0.7
    });

    return queries;
  }

  public static detectPrimaryIntent(text: string): SearchIntent {
    const lower = text.toLowerCase();
    if (lower.includes('paper') || lower.includes('arxiv') || lower.includes('doi')) return 'ACADEMIC';
    if (lower.includes('github') || lower.includes('commit') || lower.includes('repo')) return 'GITHUB';
    if (lower.includes('court') || lower.includes('statute') || lower.includes('regulation') || lower.includes('sec.gov')) return 'GOVERNMENT';
    if (lower.includes('today') || lower.includes('breaking') || lower.includes('news') || lower.includes('headline')) return 'NEWS';
    if (lower.includes('history') || lower.includes('wayback') || lower.includes('archive')) return 'HISTORICAL';
    if (lower.includes('api') || lower.includes('framework') || lower.includes('code') || lower.includes('algorithm')) return 'TECHNICAL';
    return 'GENERAL';
  }
}
