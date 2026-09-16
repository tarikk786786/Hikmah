import { MemoryClassification } from '../types.js';

export type QueryIntent =
  | 'PREFERENCE'
  | 'FACT'
  | 'HISTORY'
  | 'TIMELINE'
  | 'RELATIONSHIP'
  | 'DOCUMENT'
  | 'PROJECT'
  | 'TASK'
  | 'AGENT'
  | 'PROCEDURE'
  | 'SEMANTIC';

export class MemoryClassifier {
  private static instance: MemoryClassifier;

  public static getInstance(): MemoryClassifier {
    if (!MemoryClassifier.instance) {
      MemoryClassifier.instance = new MemoryClassifier();
    }
    return MemoryClassifier.instance;
  }

  public classifyContent(content: string): MemoryClassification {
    const text = content.toLowerCase();

    // Procedural / rules / corrections
    if (
      text.includes('always use') ||
      text.includes('never use') ||
      text.includes('coding style') ||
      text.includes('when implementing') ||
      text.includes('convention') ||
      text.includes('workflow pattern') ||
      text.includes('user correction')
    ) {
      return 'PROCEDURAL';
    }

    // Preferences / user instructions
    if (
      text.includes('prefer') ||
      text.includes('preference') ||
      text.includes('i like') ||
      text.includes('i dislike') ||
      text.includes('my favorite') ||
      text.includes('call me')
    ) {
      return 'PREFERENCE';
    }


    // Temporal / historical evolution
    if (
      text.includes('previously') ||
      text.includes('changed from') ||
      text.includes('migrated to') ||
      text.includes('upgraded to') ||
      text.includes('prior to') ||
      text.includes('deprecated') ||
      text.includes('timeline')
    ) {
      return 'TEMPORAL';
    }

    // Agent state / working memory
    if (
      text.includes('agent state') ||
      text.includes('task checkpoint') ||
      text.includes('execution step') ||
      text.includes('subagent context') ||
      text.includes('working memory')
    ) {
      return 'AGENT';
    }

    // Documents & PDFs
    if (
      text.includes('.pdf') ||
      text.includes('uploaded document') ||
      text.includes('page excerpt') ||
      text.includes('documentation chapter')
    ) {
      return 'DOCUMENT';
    }

    // Knowledge graph / entities & relationships
    if (
      text.includes('is connected to') ||
      text.includes('depends on') ||
      text.includes('relates to') ||
      text.includes('knowledge base') ||
      text.includes('architecture entity')
    ) {
      return 'RELATIONSHIP';
    }

    // Project-specific facts
    if (
      text.includes('this project') ||
      text.includes('the repository') ||
      text.includes('codebase') ||
      text.includes('architecture uses')
    ) {
      return 'PROJECT';
    }

    return 'USER';
  }

  public selectTargetProvider(classification: MemoryClassification): string {
    switch (classification) {
      case 'PREFERENCE':
      case 'USER':
        return 'mem0';
      case 'TEMPORAL':
      case 'EVENT':
        return 'graphiti';
      case 'AGENT':
      case 'WORKING':
        return 'letta';
      case 'KNOWLEDGE':
      case 'RELATIONSHIP':
      case 'ENTITY':
        return 'cognee';
      case 'PROCEDURAL':
        return 'langmem';
      case 'DOCUMENT':
        return 'supermemory';
      case 'PROJECT':
      case 'TASK':
      case 'EPISODIC':
      default:
        return 'native-supabase';
    }
  }

  public classifyQuery(queryText: string): QueryIntent {
    const text = queryText.toLowerCase();

    if (
      text.includes('what changed') ||
      text.includes('when did') ||
      text.includes('history') ||
      text.includes('previous') ||
      text.includes('timeline') ||
      text.includes('before')
    ) {
      return 'TIMELINE';
    }

    if (
      text.includes('how do i') ||
      text.includes('how should you') ||
      text.includes('what convention') ||
      text.includes('procedure') ||
      text.includes('style rule') ||
      text.includes('workflow')
    ) {
      return 'PROCEDURE';
    }

    if (
      text.includes('prefer') ||
      text.includes('preference') ||
      text.includes('favorite')
    ) {
      return 'PREFERENCE';
    }


    if (
      text.includes('related to') ||
      text.includes('connected to') ||
      text.includes('dependencies') ||
      text.includes('relationship')
    ) {
      return 'RELATIONSHIP';
    }

    if (
      text.includes('what does the document') ||
      text.includes('in the pdf') ||
      text.includes('what did the article') ||
      text.includes('file content')
    ) {
      return 'DOCUMENT';
    }

    if (
      text.includes('project') ||
      text.includes('repo') ||
      text.includes('architecture') ||
      text.includes('framework')
    ) {
      return 'PROJECT';
    }

    return 'SEMANTIC';
  }
}
