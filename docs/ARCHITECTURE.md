# HIKMAH — 6-Layer Personal AI Operating System Architecture

## Architecture Overview

Hikmah unifies 25 roadmap layers into a persistent, capability-aware, and device-aware operating system:

```text
┌────────────────────────────────────────────────────────────┐
│ LAYER 6 — PERSONAL EXPERIENCE                              │
│ Desktop HUD (/paios) • Command Bar • Unified Inbox • Tasks │
├────────────────────────────────────────────────────────────┤
│ LAYER 5 — INTELLIGENCE                                     │
│ Multi-Agent System • Reasoning • Vision • Voice • Models    │
├────────────────────────────────────────────────────────────┤
│ LAYER 4 — CAPABILITIES                                     │
│ Skills • Plugins • Providers • MCP Universal Protocol      │
├────────────────────────────────────────────────────────────┤
│ LAYER 3 — AUTOMATION                                       │
│ Workflows • Scheduler • Events • Tasks                     │
├────────────────────────────────────────────────────────────┤
│ LAYER 2 — PERSONAL DATA                                    │
│ Memory • Semantic Files • Knowledge Graph • Projects       │
├────────────────────────────────────────────────────────────┤
│ LAYER 1 — SYSTEM                                           │
│ Identity • Policy • Security • Storage • Runtime • Audit   │
└────────────────────────────────────────────────────────────┘
```

---

## Canonical Subsystem Ownership

1. **Kernel & Control Plane**: `paio/kernel/paios-kernel.ts`
2. **System Event Bus**: `paio/events/ai-system-bus.ts`
3. **Identity & Access**: `paio/identity/identity-manager.ts`
4. **Policy & Privacy**: `paio/policy/paios-policy-engine.ts`
5. **Context Engine**: `paio/context/context-engine.ts`
6. **Intent Engine**: `paio/intent/intent-engine.ts`
7. **Projects**: `paio/projects/project-manager.ts`
8. **Sessions**: `paio/sessions/session-manager.ts`
9. **Devices**: `paio/devices/device-manager.ts`
10. **Semantic Files**: `paio/files/ai-file-system.ts`
11. **Tasks**: `paio/tasks/task-manager.ts`
12. **Notifications**: `paio/notifications/notification-center.ts`
13. **System Health**: `paio/health/system-health-engine.ts`
14. **Audit Engine**: `paio/audit/paios-audit-engine.ts`
15. **MCP Server**: `paio/mcp/server.ts`
