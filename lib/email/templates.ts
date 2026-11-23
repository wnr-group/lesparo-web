/**
 * Branded transactional email templates: one responsive HTML layout plus a plain-text twin for every message.
 * Pure functions (no I/O) so they can be tested directly. All dynamic text is HTML-escaped.
 */
export type Rendered = { subject: string; html: string; text: string };

const BRAND = "Abija Exports";
const INDIGO = "#262e86";
const SUN = "#ffc82c";

export function esc(v: string | number | null | undefined) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const money = (n: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

type Block =
  | { kind: "p"; text: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "rows"; rows: [string, string][] }
  | { kind: "items"; lines: { name: string; detail: string; amount?: string }[]; total?: [string, string] }
  | { kind: "note"; text: string };

type Spec = { subject: string; preheader: string; heading: string; greeting?: string; blocks: Block[]; siteUrl: string };

/** Only http(s) links are rendered as links. */
function safeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : "#";
}

function renderBlockHtml(b: Block): string {
  switch (b.kind) {
    case "p":
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a2a35;">${esc(b.text)}</p>`;
    case "note":
      return `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b6b78;">${esc(b.text)}</p>`;
    case "button": {
      const url = esc(safeUrl(b.url));
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px;"><tr><td style="border-radius:999px;background:${INDIGO};"><a href="${url}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(b.label)}</a></td></tr></table><p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#6b6b78;word-break:break-all;">If the button does not work, copy this link into your browser:<br><a href="${url}" style="color:${INDIGO};">${url}</a></p>`;
    }
    case "rows":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-top:1px solid #e7e5df;">${b.rows
        .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e7e5df;font-size:14px;color:#6b6b78;">${esc(k)}</td><td align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid #e7e5df;font-size:14px;font-weight:600;color:#2a2a35;">${esc(v)}</td></tr>`)
        .join("")}</table>`;
    case "items":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-top:1px solid #e7e5df;">${b.lines
        .map(
          (l) =>
            `<tr><td style="padding:12px 0;border-bottom:1px solid #e7e5df;font-size:14px;color:#2a2a35;"><strong>${esc(l.name)}</strong><br><span style="color:#6b6b78;font-size:13px;">${esc(l.detail)}</span></td>${l.amount ? `<td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid #e7e5df;font-size:14px;color:#2a2a35;white-space:nowrap;">${esc(l.amount)}</td>` : ""}</tr>`,
        )
        .join("")}${b.total ? `<tr><td style="padding:14px 0;font-size:15px;font-weight:700;color:#2a2a35;">${esc(b.total[0])}</td><td align="right" style="padding:14px 0;font-size:15px;font-weight:700;color:#2a2a35;">${esc(b.total[1])}</td></tr>` : ""}</table>`;
  }
}

function renderBlockText(b: Block): string {
  switch (b.kind) {
    case "p":
    case "note":
      return b.text;
    case "button":
      return `${b.label}:\n${b.url}`;
    case "rows":
      return b.rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    case "items":
      return [...b.lines.map((l) => `- ${l.name} (${l.detail})${l.amount ? ` ${l.amount}` : ""}`), ...(b.total ? [`${b.total[0]}: ${b.total[1]}`] : [])].join("\n");
  }
}

function render(spec: Spec): Rendered {
  const body = spec.blocks.map(renderBlockHtml).join("");
  const site = esc(safeUrl(spec.siteUrl));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(spec.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ec;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f2ec;">${esc(spec.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f2ec;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="background:${INDIGO};padding:22px 28px;"><span style="font-size:20px;font-weight:800;letter-spacing:0.14em;color:#ffffff;">LESPARO</span><span style="font-size:12px;letter-spacing:0.12em;color:${SUN};text-transform:uppercase;"> &nbsp;by ${BRAND}</span></td></tr>
<tr><td style="height:4px;background:${SUN};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 8px;">
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#14142b;">${esc(spec.heading)}</h1>
${spec.greeting ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2a2a35;">${esc(spec.greeting)}</p>` : ""}
${body}
</td></tr>
<tr><td style="padding:20px 28px 28px;border-top:1px solid #e7e5df;font-size:12px;line-height:1.6;color:#6b6b78;">${BRAND}, Erode, Tamil Nadu, India<br><a href="${site}" style="color:${INDIGO};">${esc(spec.siteUrl.replace(/^https?:\/\//, ""))}</a><br>You are receiving this because of activity on your account, or an enquiry or order you made with us.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [spec.heading, spec.greeting, ...spec.blocks.map(renderBlockText), `${BRAND}, Erode, Tamil Nadu, India\n${spec.siteUrl}`].filter(Boolean).join("\n\n");
  return { subject: spec.subject, html, text };
}

const hi = (name: string) => `Hi ${name.trim().split(/\s+/)[0] || "there"},`;
const link = (siteUrl: string, path: string, token?: string) => `${siteUrl.replace(/\/$/, "")}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

export const templates = {
  verifyEmail: (d: { name: string; token: string; siteUrl: string }): Rendered =>
    render({
      subject: "Verify your email address",
      preheader: "One quick step to activate your account.",
      heading: "Verify your email",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "Thanks for creating an account. Please confirm your email address to start using it." },
        { kind: "button", label: "Verify email", url: link(d.siteUrl, "/account/verify-email", d.token) },
        { kind: "note", text: "This link works once and expires in 24 hours. If you did not create an account, you can ignore this email." },
      ],
    }),
  welcome: (d: { name: string; siteUrl: string }): Rendered =>
    render({
      subject: "Welcome to LESPARO",
      preheader: "Your account is ready.",
      heading: "Welcome aboard",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "Your email is verified and your account is ready. You can follow your orders, save delivery addresses and track your wholesale enquiries in one place." },
        { kind: "button", label: "Go to my account", url: link(d.siteUrl, "/account") },
      ],
    }),
  resetPassword: (d: { name: string; token: string; siteUrl: string }): Rendered =>
    render({
      subject: "Reset your password",
      preheader: "Use this link to choose a new password.",
      heading: "Reset your password",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "We received a request to reset the password on your account. Choose a new one with the button below." },
        { kind: "button", label: "Choose a new password", url: link(d.siteUrl, "/account/reset-password", d.token) },
        { kind: "note", text: "This link works once and expires in 1 hour. If you did not ask for this, ignore this email and your password will stay the same." },
      ],
    }),
  passwordChanged: (d: { name: string; siteUrl: string }): Rendered =>
    render({
      subject: "Your password was changed",
      preheader: "A quick security notice.",
      heading: "Password changed",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "The password on your account was just changed, and other devices were signed out." },
        { kind: "note", text: "If this was not you, reset your password right away and contact us." },
        { kind: "button", label: "Reset password", url: link(d.siteUrl, "/account/forgot-password") },
      ],
    }),
  confirmNewEmail: (d: { name: string; token: string; siteUrl: string }): Rendered =>
    render({
      subject: "Confirm your new email address",
      preheader: "Confirm the change to use this address.",
      heading: "Confirm your new email",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "You asked to use this address for your account. Confirm it to finish the change. Until then, your current email stays active." },
        { kind: "button", label: "Confirm email", url: link(d.siteUrl, "/account/verify-email", d.token) },
        { kind: "note", text: "This link works once and expires in 24 hours. If you did not ask for this, ignore this email." },
      ],
    }),
  enquiryReceived: (d: { name: string; enquiryNumber: string; items: { name: string; detail: string }[]; siteUrl: string; hasAccount: boolean }): Rendered =>
    render({
      subject: `We received your enquiry ${d.enquiryNumber}`,
      preheader: "Our sales team will get back to you soon.",
      heading: "Enquiry received",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "Thank you for your wholesale enquiry. Our sales team will review it and reply with next steps." },
        { kind: "rows", rows: [["Reference", d.enquiryNumber]] },
        ...(d.items.length ? [{ kind: "items", lines: d.items } as Block] : []),
        ...(d.hasAccount ? [{ kind: "button", label: "View my enquiries", url: link(d.siteUrl, "/account/enquiries") } as Block] : []),
      ],
    }),
  orderPlaced: (d: {
    name: string;
    orderNumber: string;
    currency: string;
    subtotal: number;
    paymentMethod: string;
    items: { name: string; size: string | null; quantity: number; unitPrice: number }[];
    shipTo: string;
    siteUrl: string;
    statusUrl: string | null;
  }): Rendered =>
    render({
      subject: `Order confirmed: ${d.orderNumber}`,
      preheader: `We have your order ${d.orderNumber}.`,
      heading: "Thank you for your order",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "We have received your order and will update you as it moves along." },
        { kind: "rows", rows: [["Order number", d.orderNumber], ["Payment", d.paymentMethod]] },
        {
          kind: "items",
          lines: d.items.map((i) => ({ name: i.name, detail: `${i.size ? `Size ${i.size}, ` : ""}Qty ${i.quantity}`, amount: money(i.unitPrice * i.quantity, d.currency) })),
          total: ["Total", money(d.subtotal, d.currency)],
        },
        { kind: "rows", rows: [["Delivering to", d.shipTo]] },
        ...(d.statusUrl ? [{ kind: "button", label: "View order", url: d.statusUrl } as Block] : []),
      ],
    }),
  paymentSuccess: (d: { name: string; orderNumber: string; currency: string; amount: number; siteUrl: string; statusUrl: string | null }): Rendered =>
    render({
      subject: `Payment received for order ${d.orderNumber}`,
      preheader: "Your payment went through.",
      heading: "Payment received",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "We have received your payment. Thank you." },
        { kind: "rows", rows: [["Order number", d.orderNumber], ["Amount paid", money(d.amount, d.currency)]] },
        ...(d.statusUrl ? [{ kind: "button", label: "View order", url: d.statusUrl } as Block] : []),
      ],
    }),
  paymentFailed: (d: { name: string; orderNumber: string; siteUrl: string; statusUrl: string | null }): Rendered =>
    render({
      subject: `Payment did not go through for order ${d.orderNumber}`,
      preheader: "Your order is saved. You can try again.",
      heading: "Payment unsuccessful",
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: "Your payment did not go through. Your order is saved and you can try the payment again." },
        { kind: "rows", rows: [["Order number", d.orderNumber]] },
        ...(d.statusUrl ? [{ kind: "button", label: "Try payment again", url: d.statusUrl } as Block] : []),
        { kind: "note", text: "If money left your account, your bank normally returns it within a few working days." },
      ],
    }),
  orderStatus: (d: {
    name: string;
    orderNumber: string;
    status: "confirmed" | "shipped" | "delivered" | "cancelled";
    tracking?: { carrier: string | null; number: string | null; url: string | null };
    siteUrl: string;
    orderUrl: string | null;
  }): Rendered => {
    const copy = {
      confirmed: ["Your order is confirmed", "We have confirmed your order and are getting it ready."],
      shipped: ["Your order is on its way", "Your order has been shipped."],
      delivered: ["Your order was delivered", "Your order has been delivered. We hope you enjoy it."],
      cancelled: ["Your order was cancelled", "Your order has been cancelled. If you did not expect this, please contact us."],
    }[d.status];
    const t = d.tracking;
    const trackRows = (d.status === "shipped" && t ? [t.carrier ? ["Carrier", t.carrier] : null, t.number ? ["Tracking number", t.number] : null] : []).filter(Boolean) as [string, string][];
    return render({
      subject: `${copy[0]}: ${d.orderNumber}`,
      preheader: copy[1],
      heading: copy[0],
      greeting: hi(d.name),
      siteUrl: d.siteUrl,
      blocks: [
        { kind: "p", text: copy[1] },
        { kind: "rows", rows: [["Order number", d.orderNumber], ...trackRows] },
        ...(d.status === "shipped" && t?.url ? [{ kind: "button", label: "Track shipment", url: t.url } as Block] : d.orderUrl ? [{ kind: "button", label: "View order", url: d.orderUrl } as Block] : []),
      ],
    });
  },
};
