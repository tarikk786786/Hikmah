import { execSync } from 'child_process';

try {
  console.log('Starting Next.js production build for apps/web...');
  execSync('npm --workspace=apps/web run build', { stdio: 'inherit' });
  console.log('Next.js build succeeded with exit code 0!');
  process.exit(0);
} catch (err) {
  console.error('Next.js build failed:', err.message);
  process.exit(1);
}
