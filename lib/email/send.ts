import "server-only";
import { after } from "next/server";
import { serverEnv } from "@/lib/env";
import { safeErrorMessage } from "@/lib/integrations/errors";
import { getEmail } from "@/lib/integrations/registry";
import type { Rendered } from "./templates";

export type SendResult = { status: "sent" | "failed" | "not_configured" };

/**
 * Sends one rendered email through the configured provider. Never throws: callers decide what a failure means for the user.
 * The idempotency key makes repeats safe (see SmtpEmail). Without a provider nothing is sent; in local development the text
 * body is printed to the server console so account flows can still be tried end to end.
 */
export async function sendEmail(opts: { to: string; rendered: Rendered; template: string; key: string; entityId?: string; replyTo?: string }): Promise<SendResult> {
  let adapter;
  try {
    adapter = getEmail();
  } catch (err) {
    console.error("[email] configuration error:", safeErrorMessage(err));
    return { status: "not_configured" };
  }
  if (!adapter) {
    if (process.env.NODE_ENV === "development") console.info(`[email:dev] not sent (EMAIL_PROVIDER=none) to=${opts.to} template=${opts.template}\n${opts.rendered.text}`);
    return { status: "not_configured" };
  }
  try {
    await adapter.send({ to: opts.to, subject: opts.rendered.subject, text: opts.rendered.text, html: opts.rendered.html, template: opts.template, entityId: opts.entityId, replyTo: opts.replyTo }, opts.key);
    return { status: "sent" };
  } catch {
    // SmtpEmail has already logged the safe error text against the delivery log.
    return { status: "failed" };
  }
}

export const siteUrl = () => serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/** Runs email work after the response when inside a request, otherwise right away. Errors are logged, never thrown. */
export function deferEmail(work: () => Promise<unknown>) {
  const run = () => work().catch((err) => console.error("[email] background send failed:", safeErrorMessage(err)));
  try {
    after(run);
  } catch {
    void run();
  }
}
