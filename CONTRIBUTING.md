# J.A.R.V.I.S. — Contributing & Extension Guide

## 1. Incremental Build Protocol
JARVIS follows an incremental evolutionary architecture. Never rewrite the core to add capabilities:
- To add a **Model Provider**: Implement `AIProvider` in `core/model-router/providers/` and register it in `ModelRouter`.
- To add a **Tool**: Implement `ToolDefinition` in `tools/adapters/` and register it in `ToolRegistry`.
- To add a **Skill**: Create a `SkillManifest` in `skills/` bundling required tools and declaring permissions.
- To add an **Agent**: Implement `Agent` in `agents/` and register a worker handler in `workers/agent-worker/index.ts`.
- To add an **MCP Server**: Register the server configuration in `mcp/servers/registry.ts`.

## 2. Coding Standards
- Strict TypeScript (`strict: true`, zero `any` in core APIs).
- Dependency injection across all subsystem classes.
- Resilient offline fallbacks for all external services (Supabase, Redis, LLM APIs).
