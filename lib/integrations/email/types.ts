export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/** Transactional email boundary. Provider not yet confirmed; see docs/integrations.md. */
export interface EmailAdapter {
  readonly provider: string;
  readonly isLive: boolean;
  send(message: EmailMessage, idempotencyKey: string): Promise<{ externalId: string }>;
}
