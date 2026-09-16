import path from 'path';
import fs from 'fs';

async function runBuild() {
  const dir = path.resolve(process.cwd(), 'apps/web');
  console.log('Running Next.js programmatic build on', dir);
  try {
    const nextBuildModule = await import('next/dist/build/index.js');
    const nextBuild = nextBuildModule.default || nextBuildModule;
    await nextBuild(dir);
    fs.writeFileSync('scratch/build-success.txt', 'BUILD SUCCESSFUL at ' + new Date().toISOString(), 'utf-8');
    console.log('Next.js build finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Build error:', err);
    fs.writeFileSync('scratch/build-error.txt', String(err?.stack || err), 'utf-8');
    process.exit(1);
  }
}

runBuild();
