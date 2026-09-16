-- ==============================================================================
-- Seed Data for JARVIS System Foundation
-- ==============================================================================

-- 1. Insert default tools
INSERT INTO public.tools (name, version, description, risk_level, input_schema, enabled)
VALUES
(
    'web_search',
    '1.0.0',
    'Search public web information via SearXNG or direct search providers',
    'LOW',
    '{"type": "object", "properties": {"query": {"type": "string", "description": "Search keywords"}}, "required": ["query"]}'::jsonb,
    TRUE
),
(
    'memory_store',
    '1.0.0',
    'Store important facts, preferences, or tasks into JARVIS memory',
    'LOW',
    '{"type": "object", "properties": {"content": {"type": "string"}, "memory_type": {"type": "string", "enum": ["long_term_memory", "preference_memory", "task_memory", "project_memory"]}, "importance": {"type": "number", "minimum": 1, "maximum": 10}}, "required": ["content", "memory_type"]}'::jsonb,
    TRUE
),
(
    'calculator',
    '1.0.0',
    'Perform safe mathematical calculations and formula evaluation',
    'LOW',
    '{"type": "object", "properties": {"expression": {"type": "string", "description": "Mathematical expression"}}, "required": ["expression"]}'::jsonb,
    TRUE
),
(
    'file_read',
    '1.0.0',
    'Read text file content from the permitted workspace sandbox',
    'MEDIUM',
    '{"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}'::jsonb,
    TRUE
),
(
    'system_status',
    '1.0.0',
    'Inspect operational status of memory, model router, queue, and background workers',
    'LOW',
    '{"type": "object", "properties": {}}'::jsonb,
    TRUE
)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert foundational skills
INSERT INTO public.skills (name, version, description, manifest, enabled)
VALUES
(
    'web',
    '1.0.0',
    'Web intelligence skill supporting search, page extraction, and summarization',
    '{"name": "web", "version": "1.0.0", "tools": ["web_search"], "permissions": ["network"]}'::jsonb,
    TRUE
),
(
    'research',
    '1.0.0',
    'Deep synthesis skill that decomposes questions, searches sources, and summarizes findings',
    '{"name": "research", "version": "1.0.0", "tools": ["web_search", "memory_store"], "permissions": ["network", "memory"]}'::jsonb,
    TRUE
),
(
    'files',
    '1.0.0',
    'Safe file reading and workspace document inspection',
    '{"name": "files", "version": "1.0.0", "tools": ["file_read"], "permissions": ["filesystem:read"]}'::jsonb,
    TRUE
)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert default system agents
INSERT INTO public.agents (name, type, description, system_prompt, model_policy, tools, enabled)
VALUES
(
    'GeneralAssistant',
    'general',
    'Default JARVIS cognitive agent for conversational reasoning and task coordination',
    'You are J.A.R.V.I.S., a sophisticated, calm, precise AI operating system. Be concise, actionable, and courteous.',
    '{"preferred": "fast", "fallback": "local"}'::jsonb,
    ARRAY['web_search', 'memory_store', 'calculator', 'system_status'],
    TRUE
),
(
    'ResearchAgent',
    'research',
    'Deep research synthesis agent capable of multi-step querying and source verification',
    'You are the JARVIS Research specialist. Perform multi-source verification and synthesize rigorous answers with citations.',
    '{"preferred": "reasoning", "fallback": "fast"}'::jsonb,
    ARRAY['web_search', 'memory_store'],
    TRUE
),
(
    'DocumentAgent',
    'document',
    'Document parsing, summarization, and key fact extraction agent',
    'You are the JARVIS Document specialist. Extract structured information and generate clean outlines.',
    '{"preferred": "fast", "fallback": "local"}'::jsonb,
    ARRAY['file_read', 'memory_store'],
    TRUE
)
ON CONFLICT (name) DO NOTHING;
