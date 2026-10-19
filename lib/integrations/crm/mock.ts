import type { CrmAdapter, CrmEnquiry } from "./types";

/**
 * In-memory CRM for development and automated tests. NOT a real integration:
 * `isLive` is false and env validation refuses it in production.
 */
export class MockCrm implements CrmAdapter {
  readonly provider = "mock";
  readonly isLive = false;
  readonly records = new Map<string, { enquiry: CrmEnquiry; status: string }>();
  private byKey = new Map<string, string>();
  failNext: "transient" | "permanent" | null = null;

  async createEnquiry(enquiry: CrmEnquiry, idempotencyKey: string) {
    await this.maybeFail();
    const existing = this.byKey.get(idempotencyKey);
    if (existing) return { externalId: existing };
    const externalId = `mock-${this.records.size + 1}`;
    this.records.set(externalId, { enquiry, status: "new" });
    this.byKey.set(idempotencyKey, externalId);
    return { externalId };
  }

  async updateEnquiryStatus(externalId: string, status: string) {
    await this.maybeFail();
    const rec = this.records.get(externalId);
    if (rec) rec.status = status;
  }

  private async maybeFail() {
    const mode = this.failNext;
    this.failNext = null;
    if (!mode) return;
    const { TransientIntegrationError, PermanentIntegrationError } = await import("../errors");
    throw mode === "transient" ? new TransientIntegrationError("mock transient failure") : new PermanentIntegrationError("mock permanent failure");
  }
}
