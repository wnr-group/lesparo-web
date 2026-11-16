import type { Metadata } from "next";
import { EnquiryStatusBadge, dateOnly } from "@/components/account/status";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomerPage } from "@/lib/auth/customer";
import { listEnquiries } from "@/lib/services/customer-account";

export const metadata: Metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const me = await requireCustomerPage("/account/enquiries");
  const enquiries = await listEnquiries(me.id);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-3 font-display text-headline font-bold">Wholesale enquiries</h1>
      </header>
      {enquiries.length === 0 ? (
        <div className="border border-dashed border-line p-10 text-center">
          <p className="text-ink-soft">You have not submitted a wholesale enquiry yet.</p>
          <ButtonLink href="/wholesale" className="mt-5">
            Make an enquiry
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((e) => (
            <li key={e.id} className="border border-line bg-plate p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{e.enquiry_number}</p>
                  <p className="text-sm text-muted">Submitted {dateOnly(e.created_at)}</p>
                </div>
                <EnquiryStatusBadge status={e.status} />
              </div>
              {e.items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                  {e.items.map((i) => (
                    <li key={i.id}>
                      {i.product_name_snapshot}
                      {i.quantity ? ` × ${i.quantity}` : ""}
                      {i.specifications ? ` (${i.specifications})` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 line-clamp-3 border-t border-line pt-3 text-sm text-muted">{e.message}</p>
              {e.status === "quotation_sent" && e.quotation_amount != null && (
                <p className="mt-3 text-sm font-semibold">
                  Quotation: {new Intl.NumberFormat("en-IN", { style: "currency", currency: e.quotation_currency || "INR", maximumFractionDigits: 0 }).format(e.quotation_amount)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
