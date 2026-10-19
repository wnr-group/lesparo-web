/**
 * Policy pages. `status: "verified"` text is copied from lesparo.com; everything else is
 * pending business approval and says so on the page. Do not publish invented policies.
 */
export type Policy = {
  slug: string;
  title: string;
  status: "verified" | "pending";
  source?: string;
  sections: { heading?: string; body: string[] }[];
};

export const POLICIES: Policy[] = [
  {
    slug: "quality",
    title: "Quality policy",
    status: "verified",
    source: "https://lesparo.com/en/content/3-terms-and-conditions-of-use",
    sections: [
      {
        heading: "QP-1",
        body: [
          "It is our Abija Exports quality policy to provide the customer with good quality wearables and an unforgettable wearing experience, to the agreed requirement in accordance with the details and price. The company is committed to achieving customer satisfaction by the use of quality procedures which will be operated to meet or exceed the requirements of international standards.",
        ],
      },
      {
        heading: "QP-2",
        body: [
          "Our replacement policy speaks for our quality assurance, and our company tries to meet international quality with maximum effort and standard quality parameters.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    status: "pending",
    sections: [
      {
        heading: "What this website collects",
        body: [
          "When you send a wholesale enquiry we store the details you enter — your name, company, email, phone, country, the products and quantities you ask about, your message and any reference files you attach — so that our sales team can respond to you.",
          "Enquiry details are visible only to authorised LESPARO staff. Reference files are stored privately and are not publicly accessible.",
          "To protect the form from abuse we keep a short-lived, anonymised count of submissions per connection.",
        ],
      },
      {
        heading: "Questions",
        body: ["To ask about, correct or remove your enquiry details, contact us using the details on our Contact page."],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    status: "pending",
    sections: [{ body: ["Our terms of use are being finalised. For any question about ordering or supply, please contact us."] }],
  },
  {
    slug: "shipping-returns",
    title: "Shipping & returns",
    status: "pending",
    sections: [
      {
        body: [
          "Orders are currently arranged directly with our sales team, who will confirm delivery and any replacement terms with you. Please contact us for details.",
        ],
      },
    ],
  },
];
