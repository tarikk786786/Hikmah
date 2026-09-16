import { describe, it, expect } from 'vitest';
import { ResearchMonitorEngine } from '../research/core/monitor-engine.js';
import { FetchRouter } from '../research/core/fetch-router.js';

describe('PRD 11: Research Change Monitor & Content Diff Engine', () => {
  it('should register, list, and check monitor jobs', async () => {
    const monitor = new ResearchMonitorEngine();

    const job = monitor.registerJob({
      id: 'mon_test_1',
      title: 'PostgreSQL Release Feed',
      targetUrls: ['https://en.wikipedia.org/wiki/PostgreSQL'],
      frequencyMinutes: 30,
      active: true,
      userId: 'usr_monitor_tester',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(monitor.getJob('mon_test_1')).toBeDefined();
    expect(monitor.listJobs('usr_monitor_tester').length).toBe(1);

    // Initial check -> changeType should be 'NEW'
    const diffs1 = await monitor.checkMonitorJob('mon_test_1');
    expect(diffs1.length).toBe(1);
    expect(diffs1[0].changeType).toBe('NEW');
    expect(diffs1[0].newHash).toBeDefined();

    // Second immediate check -> changeType should be 'UNCHANGED'
    const diffs2 = await monitor.checkMonitorJob('mon_test_1');
    expect(diffs2.length).toBe(1);
    expect(diffs2[0].changeType).toBe('UNCHANGED');
  });

  it('should detect removals and return historical diffs', async () => {
    const monitor = new ResearchMonitorEngine();

    const job = monitor.registerJob({
      id: 'mon_test_rem',
      title: 'Tracked Page',
      targetUrls: ['https://en.wikipedia.org/wiki/Linux'],
      frequencyMinutes: 60,
      active: true,
      userId: 'usr_rem_tester',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await monitor.checkMonitorJob('mon_test_rem');

    // Update job to remove URL
    job.targetUrls = [];
    monitor.registerJob(job);

    const diffsRemoved = await monitor.checkMonitorJob('mon_test_rem');
    expect(diffsRemoved.some((d) => d.changeType === 'REMOVED')).toBe(true);

    const history = monitor.getDiffHistory('mon_test_rem');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});
