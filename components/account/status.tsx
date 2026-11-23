import { Badge } from "@/components/ui/primitives";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validation/order";

const ORDER_TONE: Record<string, "indigo" | "brass" | "success" | "danger" | "neutral"> = { new: "brass", confirmed: "indigo", shipped: "indigo", delivered: "success", cancelled: "danger" };
const PAYMENT_LABEL: Record<string, string> = { pending: "Payment pending", verifying: "Confirming payment", paid: "Paid", failed: "Payment failed", refunded: "Refunded" };
const PAYMENT_TONE: Record<string, "brass" | "success" | "danger" | "neutral"> = { pending: "brass", verifying: "brass", paid: "success", failed: "danger", refunded: "neutral" };

export const OrderStatusBadge = ({ status }: { status: string }) => <Badge tone={ORDER_TONE[status] ?? "neutral"}>{ORDER_STATUS_LABELS[status as OrderStatus] ?? status}</Badge>;
export const PaymentStatusBadge = ({ status, method }: { status: string; method: string }) => (
  <Badge tone={PAYMENT_TONE[status] ?? "neutral"}>{method === "cod" && status === "pending" ? "Pay on delivery" : (PAYMENT_LABEL[status] ?? status)}</Badge>
);

const ENQUIRY_LABEL: Record<string, string> = {
  new: "Received",
  under_review: "Under review",
  info_required: "Information needed",
  quotation_prepared: "Preparing quotation",
  quotation_sent: "Quotation sent",
  accepted: "Accepted",
  rejected: "Declined",
  closed: "Closed",
};
export const enquiryLabel = (s: string) => ENQUIRY_LABEL[s] ?? s;
export const EnquiryStatusBadge = ({ status }: { status: string }) => <Badge tone={status === "accepted" ? "success" : status === "rejected" ? "danger" : status === "info_required" ? "brass" : "indigo"}>{enquiryLabel(status)}</Badge>;

export const dateOnly = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
