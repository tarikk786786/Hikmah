import { describe, it, expect, beforeEach } from 'vitest';
import { PromptManager } from '../core/model-router/prompt-manager.js';

describe('PRD 05: PromptManager Versioning & Interpolation', () => {
  let pm: PromptManager;

  beforeEach(() => {
    pm = new PromptManager();
  });

  it('should seed default built-in prompts', () => {
    const templates = pm.listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);

    const systemCore = pm.getTemplate('system.core');
    expect(systemCore).toBeDefined();
    expect(systemCore?.category).toBe('system');
    expect(systemCore?.variables).toContain('user_name');

    const planner = pm.getTemplate('planner.task_decomposition');
    expect(planner).toBeDefined();
    expect(planner?.category).toBe('planner');
  });

  it('should accurately interpolate variables in templates', () => {
    const rendered = pm.render('system.core', {
      user_name: 'Tarik',
      current_date: '2026-09-16',
      system_context: 'Antigravity Workspace'
    });

    expect(rendered).toContain('Your current user is Tarik.');
    expect(rendered).toContain("Today's date is 2026-09-16.");
    expect(rendered).toContain('System Context: Antigravity Workspace');
    expect(rendered).not.toContain('{{user_name}}');
  });

  it('should support version creation and history tracking', () => {
    const original = pm.getTemplate('security.classifier')!;
    expect(original.version).toBe('1.0.0');

    const v2 = pm.createVersion(
      'security.classifier',
      'Evaluate action: {{action_details}} with target scope: {{target_scope}} and context: {{extra_context}}',
      'Added extra_context parameter'
    );

    expect(v2.version).toBe('1.0.1');
    expect(v2.variables).toContain('extra_context');

    // Retrieve specific versions
    const retrievedV1 = pm.getTemplate('security.classifier', '1.0.0');
    expect(retrievedV1).toBeDefined();

    const retrievedLatest = pm.getTemplate('security.classifier');
    expect(retrievedLatest?.version).toBe('1.0.1');

    const history = pm.getVersionHistory('security.classifier');
    expect(history.length).toBe(2);
  });
});
