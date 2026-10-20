import type { EmailAdapter, EmailMessage } from "./types";

/** Records messages in memory. Development/test only; never presented as live. */
export class MockEmail implements EmailAdapter {
  readonly provider = "mock";
  readonly isLive = false;
  readonly sent = new Map<string, EmailMessage>();

  async send(message: EmailMessage, idempotencyKey: string) {
    if (!this.sent.has(idempotencyKey)) this.sent.set(idempotencyKey, message);
    return { externalId: `mock-email-${idempotencyKey}` };
  }
}
