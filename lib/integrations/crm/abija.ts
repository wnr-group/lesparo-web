import { PermanentIntegrationError, TransientIntegrationError } from "../errors";
import type { CrmAdapter, CrmEnquiry } from "./types";

/**
 * Abija Exports "New Enquiry" API (POST /api/new_enquiry.php, JSON, X-API-Key header).
 * See ABIJA_New_Enquiry_API_Documentation.docx.
 *
 * What the API gives us, and what that means here:
 *  - It has no idempotency support, so a repeated POST creates a second enquiry. We therefore only retry automatically when we are
 *    sure nothing was saved. When the outcome is unknown (timeout, reset connection, odd response) the job is blocked with a
 *    message telling staff to look for the website reference in Abija before pressing "Retry now".
 *  - It has no email field. The buyer's email, country, message and files stay in the website admin; only the fields the API
 *    accepts are sent (see toAbijaPayload).
 *  - It cannot update an enquiry, so `updateEnquiryStatus` does nothing.
 *
 * The API key is only ever sent in the X-API-Key header. It is never put in a URL, an error message or a log line.
 */

export type AbijaConfig = {
  /** Full endpoint URL, e.g. https://abijaexports.in/api/new_enquiry.php */
  url: string;
  apiKey: string;
  timeoutMs?: number;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
};

export type AbijaPayload = {
  name: string;
  mobile_no: string;
  company_name: string;
  address: string;
  products: string;
  value: number;
};

export const ABIJA_TIMEOUT_MS = 15_000;
/** The column size on Abija's side is not documented, so keep `products` conservative. Reference and email always come first. */
export const ABIJA_PRODUCTS_MAX = 1500;

/** "50000", "₹50,000", "5 lakh", "1.5 crore", "40k" → a number. Anything without a number is 0 (the API wants a number). */
export function parseBudget(text: string | null | undefined): number {
  if (!text) return 0;
  const m = text.toLowerCase().replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakhs?|lacs?|lakh|k)?/);
  if (!m) return 0;
  const unit = m[2];
  const factor = !unit ? 1 : unit.startsWith("cr") ? 10_000_000 : unit.startsWith("l") ? 100_000 : 1_000;
  const value = Math.round(Number(m[1]) * factor);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

const PRODUCTS_CUT_NOTE = "\n… more lines in the website admin";

/**
 * Maps a website enquiry to the fields Abija accepts. Pure, so it is easy to test.
 *
 * Only the API's own fields are sent: name, mobile_no, company_name, address, products and value. Everything else the form collects
 * (email, country, the requirement message, reference files, consent) stays in the website admin dashboard.
 * The one extra in `products` is the website reference, which is how staff find an enquiry if the outcome of a send is unknown.
 */
export function toAbijaPayload(e: CrmEnquiry): AbijaPayload {
  const itemLines = e.items.map((i) => `- ${i.productName}${i.quantity ? ` x ${i.quantity}` : ""}${i.specifications ? ` (${i.specifications})` : ""}`);
  let products = [`Website ref: ${e.enquiryNumber}`, ...itemLines].join("\n");
  if (products.length > ABIJA_PRODUCTS_MAX) products = `${products.slice(0, ABIJA_PRODUCTS_MAX - PRODUCTS_CUT_NOTE.length)}${PRODUCTS_CUT_NOTE}`;
  return {
    name: e.contact.name.trim(),
    mobile_no: e.contact.phone.trim(),
    company_name: e.company?.name.trim() ?? "",
    address: e.address?.trim() ?? "",
    products,
    value: parseBudget(e.targetBudget),
  };
}

/** The request may have reached Abija and been saved. Never retried automatically. */
export class AbijaOutcomeUnknownError extends PermanentIntegrationError {
  constructor(reason: string, ref: string) {
    super(`Outcome unknown (${reason}). Search Abija for "${ref}" before pressing Retry now, to avoid a duplicate enquiry.`);
  }
}

/** Errors that mean the request never left this server, so retrying cannot create a duplicate. */
const NOT_SENT_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ERR_INVALID_URL", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID"]);

function errorCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } } | undefined;
  return e?.cause?.code ?? e?.code;
}

type AbijaBody = { success?: boolean; message?: string; data?: { enquiry_id?: number | string; enquiry_no?: string } };

function parseBody(text: string): AbijaBody | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" ? (v as AbijaBody) : null;
  } catch {
    return null;
  }
}

/** Short, secret-free text from Abija's own message field, for the admin panel. */
function apiMessage(body: AbijaBody | null): string {
  const m = typeof body?.message === "string" ? body.message.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  return m ? `: ${m}` : "";
}

export class AbijaCrm implements CrmAdapter {
  readonly provider = "abija";
  readonly isLive = true;

  constructor(private readonly cfg: AbijaConfig) {}

  async createEnquiry(enquiry: CrmEnquiry, idempotencyKey: string): Promise<{ externalId: string }> {
    const ref = enquiry.enquiryNumber;
    const doFetch = this.cfg.fetchImpl ?? fetch;

    let res: Response;
    try {
      res = await doFetch(this.cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Key": this.cfg.apiKey,
          // Not understood by the API today. Sent so a future dedupe on their side needs no change here.
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(toAbijaPayload(enquiry)),
        redirect: "error",
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? ABIJA_TIMEOUT_MS),
      });
    } catch (err) {
      const name = (err as Error).name;
      const code = errorCode(err);
      if (code && NOT_SENT_CODES.has(code)) throw new TransientIntegrationError(`Could not reach Abija (${code})`);
      if (name === "TimeoutError" || name === "AbortError") throw new AbijaOutcomeUnknownError(`no reply within ${(this.cfg.timeoutMs ?? ABIJA_TIMEOUT_MS) / 1000}s`, ref);
      throw new AbijaOutcomeUnknownError(`connection failed${code ? ` (${code})` : ""}`, ref);
    }

    const text = await res.text().catch(() => "");
    const body = parseBody(text);

    if (res.status === 200) {
      const id = body?.data?.enquiry_id;
      if (body?.success === true && id !== undefined && id !== null && String(id) !== "") return { externalId: String(id) };
      throw new AbijaOutcomeUnknownError("HTTP 200 without an enquiry id", ref);
    }

    switch (res.status) {
      case 400:
        throw new PermanentIntegrationError(`Abija rejected the enquiry (400)${apiMessage(body)}`);
      case 401:
        throw new PermanentIntegrationError("Abija rejected the credentials (401). Check the Abija settings in the environment.");
      case 405:
        throw new PermanentIntegrationError("Abija refused the method (405). Check the Abija endpoint URL in the environment.");
      case 429:
        throw new TransientIntegrationError("Abija is rate limiting (429)");
      case 500:
        // Their documented "Unable to save enquiry": nothing was stored. A non-JSON 500 (e.g. a PHP fatal error) could have happened after the insert.
        if (body && body.success === false) throw new TransientIntegrationError(`Abija could not save the enquiry (500)${apiMessage(body)}`);
        throw new AbijaOutcomeUnknownError("HTTP 500 with an unexpected body", ref);
      case 502:
      case 503:
        throw new TransientIntegrationError(`Abija is unavailable (${res.status})`);
      default:
        if (res.status >= 500) throw new AbijaOutcomeUnknownError(`HTTP ${res.status}`, ref);
        throw new PermanentIntegrationError(`Abija responded ${res.status}${apiMessage(body)}`);
    }
  }

  /** The Abija API cannot update an enquiry. */
  async updateEnquiryStatus(): Promise<void> {}
}
