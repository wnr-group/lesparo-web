/**
 * Sends ONE clearly marked TEST enquiry to the Abija Exports API through the same adapter the website uses.
 * Each successful call creates a real record in Abija's CRM, so it is a dry run unless you pass --send.
 *
 *   npm run abija:test                 shows what would be sent (no network call)
 *   npm run abija:test -- --send       sends the TEST enquiry and prints the returned Abija id
 *   npm run abija:test -- --send --bad-key   sends with a wrong key to confirm the 401 path (creates nothing)
 *
 * Reads ABIJA_ENQUIRY_API_URL and ABIJA_ENQUIRY_API_KEY from .env.local. The key is never printed.
 */
import { AbijaCrm, toAbijaPayload } from "../lib/integrations/crm/abija";
import type { CrmEnquiry } from "../lib/integrations/crm/types";

const args = new Set(process.argv.slice(2));
const send = args.has("--send");
const badKey = args.has("--bad-key");

const url = process.env.ABIJA_ENQUIRY_API_URL;
const realKey = process.env.ABIJA_ENQUIRY_API_KEY;
if (!url || !realKey) {
  console.error("Set ABIJA_ENQUIRY_API_URL and ABIJA_ENQUIRY_API_KEY in .env.local first.");
  process.exit(1);
}
if (new URL(url).protocol !== "https:") {
  console.error("ABIJA_ENQUIRY_API_URL must be an https URL.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const enquiry: CrmEnquiry = {
  websiteEnquiryId: `test-${stamp}`,
  enquiryNumber: `LSP-TEST-${stamp}`,
  contact: { name: "TEST LESPARO integration (ignore)", email: "test@lesparo.invalid", phone: "0000000000", country: "India" },
  company: { name: "LESPARO TEST (ignore)" },
  address: "TEST address, Erode, Tamil Nadu",
  message: "TEST enquiry sent by the LESPARO website integration check. Please ignore and delete.",
  targetBudget: "100000",
  items: [{ productName: "TEST item", quantity: 1, specifications: "integration check" }],
  source: "website",
  submittedAt: new Date().toISOString(),
};

console.log(`Endpoint: ${new URL(url).host}${new URL(url).pathname}`);
console.log("Payload:", JSON.stringify(toAbijaPayload(enquiry), null, 2));

if (!send) {
  console.log("\nDry run. Nothing was sent. Add --send to create the TEST enquiry.");
  process.exit(0);
}

const crm = new AbijaCrm({ url, apiKey: badKey ? "wrong-key-for-401-check" : realKey });
crm
  .createEnquiry(enquiry, `crm.create_enquiry:${enquiry.websiteEnquiryId}`)
  .then(({ externalId }) => {
    console.log(`\nOK. Abija enquiry id: ${externalId}`);
    console.log(`Search Abija for "${enquiry.enquiryNumber}" and delete this TEST record.`);
  })
  .catch((err: Error) => {
    console.error(`\nFAILED (${err.constructor.name}): ${err.message}`);
    process.exitCode = badKey && /401/.test(err.message) ? 0 : 1;
    if (badKey && /401/.test(err.message)) console.log("That is the expected result for --bad-key.");
  });
