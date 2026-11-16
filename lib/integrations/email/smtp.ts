import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { PermanentIntegrationError, TransientIntegrationError, safeErrorMessage } from "../errors";
import type { EmailAdapter, EmailMessage } from "./types";

/** SMTP response codes that mean "try again later". */
function classify(err: unknown): Error {
  const e = err as { responseCode?: number; code?: string };
  const msg = safeErrorMessage(err);
  const transientCode = ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ESOCKET", "EDNS", "ECONNREFUSED"].includes(e.code ?? "");
  if (transientCode || (e.responseCode && e.responseCode >= 400 && e.responseCode < 500)) return new TransientIntegrationError(`SMTP: ${msg}`);
  return new PermanentIntegrationError(`SMTP: ${msg}`);
}

/**
 * Sends through the configured SMTP server. Every message is claimed in `email_logs` by idempotency key first, so a retried job
 * or a repeated trigger never mails the same person twice. Only addresses, template names and safe error text are logged:
 * never the body, links, tokens or credentials.
 */
export class SmtpEmail implements EmailAdapter {
  readonly provider = "smtp";
  readonly isLive = true;
  private transporter: Transporter | null = null;

  private transport() {
    if (this.transporter) return this.transporter;
    const env = serverEnv();
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return this.transporter;
  }

  async send(message: EmailMessage, idempotencyKey: string) {
    const env = serverEnv();
    const existing = await prisma.emailLog.findUnique({ where: { idempotency_key: idempotencyKey }, select: { id: true, status: true, provider_id: true, updated_at: true } });
    if (existing?.status === "sent") return { externalId: existing.provider_id ?? existing.id };
    // Another worker claimed it a moment ago: do not send in parallel. A stale claim (crashed worker) is taken over.
    if (existing?.status === "sending" && Date.now() - existing.updated_at.getTime() < 120_000) return { externalId: existing.id };

    let logId: string;
    if (existing) {
      const claimed = await prisma.emailLog.updateMany({
        where: { id: existing.id, status: existing.status, updated_at: existing.updated_at },
        data: { status: "sending", attempts: { increment: 1 }, subject: message.subject },
      });
      if (!claimed.count) return { externalId: existing.id };
      logId = existing.id;
    } else {
      try {
        const row = await prisma.emailLog.create({
          data: { idempotency_key: idempotencyKey, template: message.template ?? "custom", to_email: message.to, subject: message.subject, entity_id: message.entityId ?? null, status: "sending", attempts: 1 },
          select: { id: true },
        });
        logId = row.id;
      } catch {
        // Lost the race to create the row: the winner sends it.
        const other = await prisma.emailLog.findUnique({ where: { idempotency_key: idempotencyKey }, select: { id: true } });
        return { externalId: other?.id ?? idempotencyKey };
      }
    }

    try {
      const info = await this.transport().sendMail({
        from: { name: env.SMTP_FROM_NAME ?? "Abija Exports", address: env.SMTP_FROM_EMAIL! },
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      await prisma.emailLog.update({ where: { id: logId }, data: { status: "sent", sent_at: new Date(), provider_id: String(info.messageId ?? "").slice(0, 200) || null, last_error: null } });
      return { externalId: String(info.messageId ?? logId) };
    } catch (err) {
      const failure = classify(err);
      await prisma.emailLog.update({ where: { id: logId }, data: { status: "failed", last_error: failure.message } }).catch(() => {});
      console.warn(`[email] ${message.template ?? "custom"} failed: ${failure.message}`);
      throw failure;
    }
  }
}
