#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const appsWebNext = path.join(rootDir, 'apps', 'web', '.next');
const rootNext = path.join(rootDir, '.next');

// 1. Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 2. Ensure robots.txt exists
const robotsPath = path.join(publicDir, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  fs.writeFileSync(robotsPath, 'User-agent: *\nAllow: /\n', 'utf-8');
}

// 3. Ensure index.html exists
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  const html = `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0; url=/paios"></head>
<body>Redirecting to Hikmah PAIOS...</body></html>`;
  fs.writeFileSync(indexPath, html, 'utf-8');
}

console.log('[prepare-vercel] Verified public directory and fallback assets.');
