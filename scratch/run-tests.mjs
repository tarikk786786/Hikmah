import { startVitest } from 'vitest/node';
import fs from 'fs';

async function main() {
  console.log('Starting Vitest programmatically...');
  try {
    const vitest = await startVitest('test', [
      'tests/research-search-router.test.ts',
      'tests/research-fetch-extraction.test.ts',
      'tests/research-verification-claims.test.ts',
      'tests/research-timeline-entities.test.ts',
      'tests/research-monitor-diff.test.ts',
      'tests/research-mcp.test.ts',
      'tests/research-orchestrator.test.ts',
    ], {
      run: true,
      reporter: ['basic'],
    });

    const testFiles = vitest?.state?.getFiles() || [];
    const summary = {
      totalFiles: testFiles.length,
      passedFiles: testFiles.filter((f) => f.result?.state === 'pass').length,
      failedFiles: testFiles.filter((f) => f.result?.state === 'fail').length,
      files: testFiles.map((f) => ({
        name: f.name,
        state: f.result?.state,
        duration: f.result?.duration,
      })),
    };

    fs.writeFileSync('scratch/vitest-summary.json', JSON.stringify(summary, null, 2), 'utf-8');
    console.log('Vitest summary saved:', summary);
    await vitest?.close();
    process.exit(summary.failedFiles > 0 ? 1 : 0);
  } catch (err) {
    console.error('Vitest execution error:', err);
    fs.writeFileSync('scratch/vitest-error.txt', String(err?.stack || err), 'utf-8');
    process.exit(1);
  }
}

main();
