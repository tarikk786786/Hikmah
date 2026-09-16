# J.A.R.V.I.S. — Installable Skills Specification

## 1. Concept
A **Skill** in JARVIS is a curated capability package that bundles:
- Associated **Tools**
- Explicit **Permission Declarations**
- Context & Behavioral Guidelines
- Testing & Configuration Schema

## 2. Skill Manifest Schema
```typescript
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  tools: string[];
  permissions: SkillPermission[];
  configuration?: Record<string, unknown>;
  enabled: boolean;
}
```

## 3. Supported Permissions
- `network`: External HTTP/HTTPS communication.
- `filesystem:read`: Read-only access inside workspace sandbox.
- `filesystem:write`: Write access inside workspace sandbox.
- `browser:control`: Headless Chromium navigation and interaction.
- `terminal:execute`: Sandboxed shell execution.
- `memory:read` / `memory:write`: Long-term cognitive memory operations.

## 4. Phase 1 Skills
- **`web`**: Real-time web intelligence and page extraction.
- **`research`**: Multi-source querying, cross-verification, and automatic knowledge ingestion.
- **`files`**: Workspace file discovery and inspection.
- **`coding`**: Prepared interfaces for OpenHands code analysis and patch application.
- **`browser`**: Prepared interfaces for Playwright / browser-use worker automation.
- **`cellular-geointel`**: Cellular infrastructure analysis, RF triangulation, authorized device telemetry, and OpenStreetMap geolocation.
- **`memory-router`**: Multi-engine memory routing, temporal knowledge graphs, procedural learning, and cross-provider context retrieval.
- **`universal-storage`**: Multi-tier storage orchestration, AES-256-GCM envelope encryption, Telegram TG-S3 cold archiving, chunking, and automated backups.
- **`deep-research`**: 11-stage autonomous research pipeline, SearXNG/Academic/GitHub search, Trafilatura extraction, wire-service clustering, claim verification, and anti-hallucination citation validation.
- **`browser-intelligence`**: Deterministic Playwright driver execution, Stagehand semantic intent translation, self-healing selector recovery, autonomous BrowserUseAgent goal execution, and profile/cookie isolation.




