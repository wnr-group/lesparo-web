/**
 * Business details verified on lesparo.com (Contact Us, footer, Company History pages,
 * crawled 2026-10-19). Change only with business confirmation.
 */
export const BUSINESS = {
  brand: "LESPARO",
  legalName: "Abija Exports",
  displayName: "LESPARO — Abija Exports",
  tagline: "Accomplish Great Things",
  address: {
    lines: ["5, 5A, 5B, NMS Compound", "Erode Fort"],
    city: "Erode",
    postcode: "638001",
    region: "Tamil Nadu",
    country: "India",
  },
  phone: { display: "094430 22044", href: "tel:+919443022044" },
  customerCare: { display: "93425 46046", href: "tel:+919342546046", hours: "9 AM – 6:30 PM" },
  // The live Contact page also lists "Contact timing: 9 AM – 7:30 PM"; the two differ (pending confirmation).
  contactHours: "9 AM – 7:30 PM",
  email: "admin1@abijaexports.com",
  social: [
    { label: "Instagram", href: "https://www.instagram.com/lesparofashions" },
    { label: "Twitter / X", href: "https://twitter.com/lesparofashions" },
  ],
} as const;

export function formattedAddress() {
  const a = BUSINESS.address;
  return [...a.lines, `${a.city} – ${a.postcode}`, `${a.region}, ${a.country}`];
}
