import { startVitest } from 'vitest/node';
import fs from 'fs';

async function main() {
  console.log('Starting Browser Vitest tests programmatically...');
  try {
    const vitest = await startVitest(
      'test',
      [
        'tests/browser-driver.test.ts',
        'tests/browser-session-profile.test.ts',
        'tests/browser-semantic-stagehand.test.ts',
        'tests/browser-self-healing.test.ts',
        'tests/browser-mcp.test.ts',
        'tests/browser-orchestrator.test.ts',
      ],
      {
        run: true,
        reporter: ['basic'],
      }
    );

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

    fs.writeFileSync('scratch/browser-vitest-summary.json', JSON.stringify(summary, null, 2), 'utf-8');
    console.log('Browser Vitest summary saved:', JSON.stringify(summary, null, 2));
    await vitest?.close();
    process.exit(summary.failedFiles > 0 ? 1 : 0);
  } catch (err) {
    console.error('Browser Vitest execution error:', err);
    fs.writeFileSync('scratch/browser-vitest-error.txt', String(err?.stack || err), 'utf-8');
    process.exit(1);
  }
}

main();
