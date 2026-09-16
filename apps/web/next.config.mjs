import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: rootDir,
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/core': path.resolve(rootDir, 'core'),
      '@/memory': path.resolve(rootDir, 'memory'),
      '@/agents': path.resolve(rootDir, 'agents'),
      '@/tools': path.resolve(rootDir, 'tools'),
      '@/skills': path.resolve(rootDir, 'skills'),
      '@/voice': path.resolve(rootDir, 'voice'),
      '@/workflows': path.resolve(rootDir, 'workflows'),
      '@/mcp': path.resolve(rootDir, 'mcp'),
      '@/security': path.resolve(rootDir, 'security'),
      '@/workers': path.resolve(rootDir, 'workers'),
      '@/storage': path.resolve(rootDir, 'storage'),
      '@/research': path.resolve(rootDir, 'research'),
      '@/browser': path.resolve(rootDir, 'browser'),
      '@/orchestration': path.resolve(rootDir, 'orchestration'),
    };
    return config;

  },
};

export default nextConfig;
