/**
 * Provider-independent CRM boundary. The concrete CRM has not been chosen yet; a real
 * adapter implements this interface and is registered in ./index.ts.
 */
export type CrmEnquiry = {
  websiteEnquiryId: string;
  enquiryNumber: string;
  contact: { name: string; email: string; phone: string; country?: string | null };
  company?: { name: string } | null;
  message: string;
  targetBudget?: string | null;
  items: { productName: string; quantity: number | null; specifications: string | null }[];
  source: "website";
  submittedAt: string;
};

export interface CrmAdapter {
  readonly provider: string;
  /** Live adapters return true; mocks must return false so the UI never presents them as production. */
  readonly isLive: boolean;
  /**
   * Creates (or finds, by websiteEnquiryId) the CRM record for an enquiry, upserting the
   * contact and company as the provider requires. Must be idempotent.
   */
  createEnquiry(enquiry: CrmEnquiry, idempotencyKey: string): Promise<{ externalId: string }>;
  updateEnquiryStatus(externalId: string, status: string): Promise<void>;
}
