export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Branded HTML alternative (see lib/email/templates.ts). */
  html?: string;
  replyTo?: string;
  /** Template name and related record, kept in the delivery log (never the body or links). */
  template?: string;
  entityId?: string;
};

/** Transactional email boundary. `smtp` is the live provider; `mock` is for local tests only. */
export interface EmailAdapter {
  readonly provider: string;
  readonly isLive: boolean;
  send(message: EmailMessage, idempotencyKey: string): Promise<{ externalId: string }>;
}
