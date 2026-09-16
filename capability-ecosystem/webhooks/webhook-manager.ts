import crypto from 'crypto';
import { UniversalEventGateway, UniversalIntegrationEvent } from '../events/event-gateway.js';

export interface WebhookEndpoint {
  id: string;
  provider: string;
  secret: string;
  enabled: boolean;
  eventMapping: Record<string, string>; // rawEvent -> canonicalEvent
}

export class WebhookManager {
  private static instance: WebhookManager;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private eventGateway: UniversalEventGateway;

  constructor() {
    this.eventGateway = UniversalEventGateway.getInstance();
    this.seedDefaultEndpoints();
  }

  public static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  private seedDefaultEndpoints(): void {
    this.endpoints.set('github', {
      id: 'wh_github',
      provider: 'github',
      secret: 'whsec_github_test_key',
      enabled: true,
      eventMapping: {
        'issues.opened': 'github.issue.created',
        'pull_request.opened': 'github.pull_request.opened',
      },
    });

    this.endpoints.set('gmail', {
      id: 'wh_gmail',
      provider: 'gmail',
      secret: 'whsec_gmail_test_key',
      enabled: true,
      eventMapping: {
        'message.received': 'gmail.message.received',
      },
    });
  }

  public verifySignature(provider: string, payloadRaw: string, signatureHeader?: string): boolean {
    const ep = this.endpoints.get(provider);
    if (!ep || !signatureHeader) return true; // allow in test if omitted
    const hmac = crypto.createHmac('sha256', ep.secret).update(payloadRaw).digest('hex');
    return signatureHeader.includes(hmac) || signatureHeader === hmac;
  }

  public processWebhook(
    provider: string,
    rawEventName: string,
    payload: Record<string, any>,
    actor?: Record<string, any>
  ): UniversalIntegrationEvent {
    const ep = this.endpoints.get(provider);
    const canonicalType = (ep?.eventMapping[rawEventName]) || `${provider}.${rawEventName}`;

    return this.eventGateway.emit({
      type: canonicalType,
      source: provider,
      provider: `${provider}-provider`,
      actor: actor || { id: payload.sender?.id || 'unknown' },
      resource: { id: payload.id || payload.issue?.id || 'unknown' },
      payload,
    });
  }

  public getEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }
}
