#!/usr/bin/env node

/**
 * HIKMAH — Production Smoke Verification Script
 * Validates production health, readiness, APIs, and PAIOS core endpoints.
 */

const BASE_URL = process.env.PRODUCTION_URL || 'http://localhost:3000';

async function testEndpoint(name, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - start;
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    const passed = res.status >= 200 && res.status < 400;

    // Check for accidental secret leakage in output
    const rawStr = JSON.stringify(data);
    const leaked = /service_role|eyJh|secret_|password/i.test(rawStr) && !rawStr.includes('***');

    if (passed && !leaked) {
      console.log(`  ✓ [PASS] ${name} (${path}) — ${res.status} ${res.statusText} [${latency}ms]`);
      return { name, passed: true, latency, data };
    } else {
      console.error(`  ✗ [FAIL] ${name} (${path}) — status ${res.status}, leaked: ${leaked}`);
      return { name, passed: false, latency, error: `Status ${res.status}, leaked: ${leaked}` };
    }
  } catch (err) {
    const latency = Date.now() - start;
    console.error(`  ✗ [ERROR] ${name} (${path}) — ${err.message} [${latency}ms]`);
    return { name, passed: false, latency, error: err.message };
  }
}

async function runSmokeTests() {
  console.log(`\n==================================================`);
  console.log(`  HIKMAH LIVE SMOKE TEST HARNESS`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`==================================================\n`);

  const results = [];

  // 1. Root Health
  results.push(await testEndpoint('Root Production Health', '/health'));

  // 2. Root Readiness
  results.push(await testEndpoint('Root Production Readiness', '/ready'));

  // 3. API Health
  results.push(await testEndpoint('API Canonical Health', '/api/health'));

  // 4. PAIOS Status
  results.push(await testEndpoint('PAIOS Kernel Status', '/api/paios/status'));

  // 5. PAIOS Command Execution
  results.push(await testEndpoint('PAIOS Command Execution', '/api/paios/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'Smoke test audit and system check' }),
  }));

  // 6. PAIOS Projects
  results.push(await testEndpoint('PAIOS Projects Listing', '/api/paios/projects'));

  // 7. PAIOS Tasks
  results.push(await testEndpoint('PAIOS Tasks Board', '/api/paios/tasks'));

  // 8. PAIOS Notifications
  results.push(await testEndpoint('PAIOS Unified Notifications', '/api/paios/notifications'));

  // 9. Master UI HUD
  results.push(await testEndpoint('Master PAIOS Desktop Cockpit UI', '/paios'));

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log(`\n--------------------------------------------------`);
  console.log(`  Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log(`--------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log(`  ✓ All production smoke endpoints passed successfully!\n`);
  }
}

runSmokeTests();
