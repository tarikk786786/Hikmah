import { describe, it, expect } from 'vitest';
import { ResearchOrchestrator } from '../research/core/orchestrator.js';

describe('PRD 11: End-to-End Research Orchestrator Pipeline', () => {
  const orchestrator = new ResearchOrchestrator();

  it('should initialize task with mode-specific budget', async () => {
    const task = await orchestrator.startResearch({
      question: 'How do LSM-trees compare to B-Trees in storage engines?',
      mode: 'STANDARD',
      userId: 'usr_benchmarker',
    });

    expect(task.id).toMatch(/^res_/);
    expect(task.mode).toBe('STANDARD');
    expect(task.status).toBe('PENDING');
    expect(task.budget.maxQueries).toBe(5);
    expect(task.budget.maxPages).toBe(15);
  });

  it('should execute full 11-stage research pipeline and generate report', async () => {
    const task = await orchestrator.startResearch({
      question: 'Explain CRDTs for distributed state synchronization',
      mode: 'QUICK',
      userId: 'usr_researcher_1',
    });

    const report = await orchestrator.executePipeline(task.id);

    expect(report).toBeDefined();
    expect(report.researchId).toBe(task.id);
    expect(report.summary).toBeDefined();
    expect(report.methodology).toContain('Hikmah Deep Research Pipeline');
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.markdown).toContain('# Research Report');
    expect(report.markdown).toContain('Executive Summary');
    expect(report.markdown).toContain('Methodology');

    // Verify task state updated to COMPLETED
    const updatedTask = orchestrator.getTask(task.id);
    expect(updatedTask?.status).toBe('COMPLETED');
    expect(updatedTask?.progressPercent).toBe(100);
    expect(updatedTask?.report).toBeDefined();
  });

  it('should retrieve report via getReport and list tasks', async () => {
    const task = await orchestrator.startResearch({
      question: 'What is WebAssembly System Interface (WASI)?',
      mode: 'QUICK',
      userId: 'usr_researcher_2',
    });
    await orchestrator.executePipeline(task.id);

    const retrievedReport = orchestrator.getReport(task.id);
    expect(retrievedReport).toBeDefined();
    expect(retrievedReport?.question).toBe('What is WebAssembly System Interface (WASI)?');

    const userTasks = orchestrator.listTasks('usr_researcher_2');
    expect(userTasks.length).toBe(1);
    expect(userTasks[0].id).toBe(task.id);
  });
});
