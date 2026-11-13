/**
 * PLACEHOLDER product content. Used only where the catalogue has nothing for a product yet (no description, features or fabric),
 * so every product page has the same complete layout. Nothing here is a claim about a specific product's fabric, weight or
 * origin: it is neutral wording to be replaced by real content in the admin. Where real content exists, it is always used instead.
 */
import type { ProductDetail } from "./queries";

export const PLACEHOLDER_NOTE = "Detailed product information will be updated soon.";

export function placeholderDescription(p: Pick<ProductDetail, "name" | "category">): string {
  const kind = p.category?.name ? p.category.name.toLowerCase() : "garment";
  return `${p.name} is part of the LESPARO ${kind} range from Abija Exports, Erode. ${PLACEHOLDER_NOTE} For fabric, sizes and bulk pricing, contact us and we will help.`;
}

export const PLACEHOLDER_FEATURES = ["Everyday comfort fit", "Made in Erode, Tamil Nadu", "Supplied to showrooms across Tamil Nadu, Kerala and Karnataka", "Bulk and wholesale rates on enquiry"];

export const PLACEHOLDER_CARE = ["Wash separately in cold water the first few times", "Use a mild detergent; avoid bleach", "Dry in the shade", "Warm iron on the reverse side"];

export const DELIVERY_POINTS = [
  { title: "Delivery", body: "Delivery details are confirmed at checkout or by our team on enquiry." },
  { title: "Returns & exchange", body: "Please see our policies page for the current returns and exchange terms." },
  { title: "Wholesale", body: "Shops and showrooms can ask for pack sizes, bulk pricing and supply schedules." },
];

export const PLACEHOLDER_SIZE_NOTE = "Size chart coming soon. Ask us if you are unsure about a fit.";
