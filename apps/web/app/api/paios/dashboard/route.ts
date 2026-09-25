import { NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET() {
  try {
    const kernel = PAIOSKernel.getInstance();
    if (!kernel.getStatus().isBooted) {
      await kernel.boot();
    }

    const agents = kernel.agents.listAgents();
    const knowledgeCount = kernel.knowledge.getVaultMap().length;
    const models = [
      { id: 'gpt-4o', type: 'cloud', capabilities: ['reasoning', 'vision', 'coding'] },
      { id: 'claude-3-5-sonnet', type: 'cloud', capabilities: ['reasoning', 'coding'] },
      { id: 'llama-3.1-8b', type: 'local', capabilities: ['general', 'fast'] }
    ]; // Placeholder for model registry state

    return NextResponse.json({
      success: true,
      data: {
        agentCount: agents.length,
        knowledgeCount: knowledgeCount,
        activeModels: models.length,
        systemHealth: kernel.health.getReport().overall,
        uptime: kernel.getStatus().uptimeSeconds,
        privacyMode: kernel.policy.getPrivacyMode()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch dashboard' }, { status: 500 });
  }
}
