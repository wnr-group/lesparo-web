import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/primitives";
import { ENQUIRY_STATUS_LABELS, type EnquiryStatus } from "@/lib/validation/enquiry";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="link-draw text-sm text-muted">
            ← {back.label}
          </Link>
        )}
        <h1 className="mt-1 font-display text-4xl font-semibold">{title}</h1>
        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Route-level loading state: lets client navigations between admin pages render immediately. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">{label}</span>
      <div className="mb-8 h-10 w-56 bg-line" />
      <div className="space-y-px border border-line bg-line">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 bg-plate" />
        ))}
      </div>
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx("border border-line bg-plate", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-plate">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-line bg-ivory text-xs uppercase tracking-[0.1em] text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

const STATUS_TONE: Record<EnquiryStatus, Parameters<typeof Badge>[0]["tone"]> = {
  new: "indigo",
  under_review: "brass",
  info_required: "warning",
  quotation_prepared: "brass",
  quotation_sent: "indigo",
  accepted: "success",
  rejected: "danger",
  closed: "neutral",
};

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ENQUIRY_STATUS_LABELS[status]}</Badge>;
}

export function SyncBadge({ status: raw }: { status: string }) {
  const status = (["not_configured", "pending", "synced", "failed"].includes(raw) ? raw : "not_configured") as "not_configured" | "pending" | "synced" | "failed";
  const map = {
    not_configured: ["neutral", "CRM not configured"],
    pending: ["brass", "CRM pending"],
    synced: ["success", "CRM synced"],
    failed: ["danger", "CRM failed"],
  } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="border border-line bg-plate px-3 py-1.5 hover:border-ink">
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link href={href(page + 1)} className="border border-line bg-plate px-3 py-1.5 hover:border-ink">
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

export function formatDate(iso: string | Date | null | undefined, withTime = false) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", ...(withTime && { timeStyle: "short" }), timeZone: "Asia/Kolkata" }).format(new Date(iso));
}
