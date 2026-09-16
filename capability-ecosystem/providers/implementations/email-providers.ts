import {
  EmailProvider,
  EmailMessage,
  SendEmailInput,
  EmailQuery,
  ProviderHealthReport,
  ProviderConfig,
  AuthContext,
  AuthResult,
  ExecutionContext,
} from '../interfaces/provider.js';

export class GmailProvider implements EmailProvider {
  public readonly id = 'gmail-provider';
  public readonly name = 'Google Gmail API Provider';
  public readonly version = '2.1.0';
  public readonly category = 'Email';

  private configured = false;
  private authenticated = false;
  private failureCount = 0;
  private mockEmails: EmailMessage[] = [
    {
      id: 'msg_gmail_001',
      from: 'alex@example.com',
      to: ['user@company.com'],
      subject: 'Q3 Financial Review Notes',
      body: 'Hi team, please find the attached notes for our Q3 planning.',
      date: new Date().toISOString(),
      unread: true,
      labels: ['INBOX', 'IMPORTANT'],
    },
    {
      id: 'msg_gmail_002',
      from: 'security@alert.com',
      to: ['user@company.com'],
      subject: 'Security Alert: New device login',
      body: 'A new login from Windows device was detected.',
      date: new Date().toISOString(),
      unread: false,
      labels: ['INBOX', 'SECURITY'],
    },
  ];

  public async capabilities(): Promise<Record<string, boolean>> {
    return {
      'email.search': true,
      'email.read': true,
      'email.send': true,
      'email.reply': true,
      'email.labels': true,
      'email.attachments': true,
    };
  }

  public async health(): Promise<ProviderHealthReport> {
    return {
      status: this.failureCount > 3 ? 'UNAVAILABLE' : 'HEALTHY',
      latencyMs: 45,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: this.failureCount,
    };
  }

  public setFailureState(failures: number): void {
    this.failureCount = failures;
  }

  public async configure(config: ProviderConfig): Promise<void> {
    this.configured = true;
  }

  public async authenticate(context: AuthContext): Promise<AuthResult> {
    this.authenticated = true;
    return {
      authenticated: true,
      accountId: context.accountId || 'account-google-primary',
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    };
  }

  public async execute(operation: string, input: any, context?: ExecutionContext): Promise<any> {
    switch (operation) {
      case 'email.search':
        return this.search(input, context);
      case 'email.read':
        return this.read(input.id, context);
      case 'email.send':
        return this.send(input, context);
      case 'email.reply':
        return this.reply(input.id, input.body, context);
      default:
        throw new Error(`Unsupported operation '${operation}' on GmailProvider`);
    }
  }

  public async search(query: EmailQuery, context?: ExecutionContext): Promise<EmailMessage[]> {
    if (this.failureCount > 3) throw new Error('Gmail API service unavailable');
    let res = [...this.mockEmails];
    if (query.unreadOnly) {
      res = res.filter(e => e.unread);
    }
    if (query.query) {
      const q = query.query.toLowerCase();
      res = res.filter(e => e.subject.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
    }
    return res;
  }

  public async read(id: string, context?: ExecutionContext): Promise<EmailMessage> {
    const email = this.mockEmails.find(e => e.id === id);
    if (!email) throw new Error(`Email with id '${id}' not found in Gmail`);
    return email;
  }

  public async send(input: SendEmailInput, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }> {
    if (this.failureCount > 3) throw new Error('Gmail API service unavailable');
    const newMsg: EmailMessage = {
      id: `msg_gmail_${Date.now()}`,
      from: 'user@company.com',
      to: input.to,
      subject: input.subject,
      body: input.body,
      date: new Date().toISOString(),
      unread: false,
    };
    this.mockEmails.push(newMsg);
    return { success: true, messageId: newMsg.id };
  }

  public async reply(id: string, body: string, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }> {
    const original = await this.read(id, context);
    return this.send({
      to: [original.from],
      subject: `Re: ${original.subject}`,
      body,
    }, context);
  }
}

export class OutlookProvider implements EmailProvider {
  public readonly id = 'outlook-provider';
  public readonly name = 'Microsoft Graph Outlook Provider';
  public readonly version = '2.0.0';
  public readonly category = 'Email';

  private mockEmails: EmailMessage[] = [
    {
      id: 'msg_outlook_001',
      from: 'sarah@enterprise.com',
      to: ['user@company.com'],
      subject: 'Weekly Sprint Standup Summary',
      body: 'All tasks on schedule for release 2.4.',
      date: new Date().toISOString(),
      unread: true,
      labels: ['INBOX'],
    },
  ];

  public async capabilities(): Promise<Record<string, boolean>> {
    return {
      'email.search': true,
      'email.read': true,
      'email.send': true,
      'email.reply': true,
      'email.labels': true,
      'email.attachments': true,
    };
  }

  public async health(): Promise<ProviderHealthReport> {
    return {
      status: 'HEALTHY',
      latencyMs: 50,
      lastCheckedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    };
  }

  public async configure(config: ProviderConfig): Promise<void> {}

  public async authenticate(context: AuthContext): Promise<AuthResult> {
    return {
      authenticated: true,
      accountId: context.accountId || 'account-msft-primary',
      scopes: ['Mail.ReadWrite', 'Mail.Send'],
    };
  }

  public async execute(operation: string, input: any, context?: ExecutionContext): Promise<any> {
    switch (operation) {
      case 'email.search':
        return this.search(input, context);
      case 'email.read':
        return this.read(input.id, context);
      case 'email.send':
        return this.send(input, context);
      case 'email.reply':
        return this.reply(input.id, input.body, context);
      default:
        throw new Error(`Unsupported operation '${operation}' on OutlookProvider`);
    }
  }

  public async search(query: EmailQuery, context?: ExecutionContext): Promise<EmailMessage[]> {
    let res = [...this.mockEmails];
    if (query.unreadOnly) {
      res = res.filter(e => e.unread);
    }
    if (query.query) {
      const q = query.query.toLowerCase();
      res = res.filter(e => e.subject.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
    }
    return res;
  }

  public async read(id: string, context?: ExecutionContext): Promise<EmailMessage> {
    const email = this.mockEmails.find(e => e.id === id);
    if (!email) throw new Error(`Email with id '${id}' not found in Outlook`);
    return email;
  }

  public async send(input: SendEmailInput, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }> {
    const newMsg: EmailMessage = {
      id: `msg_outlook_${Date.now()}`,
      from: 'user@company.com',
      to: input.to,
      subject: input.subject,
      body: input.body,
      date: new Date().toISOString(),
      unread: false,
    };
    this.mockEmails.push(newMsg);
    return { success: true, messageId: newMsg.id };
  }

  public async reply(id: string, body: string, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }> {
    const original = await this.read(id, context);
    return this.send({
      to: [original.from],
      subject: `Re: ${original.subject}`,
      body,
    }, context);
  }
}
