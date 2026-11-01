"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type Session = { alreadyPaid: true } | { alreadyPaid: false; keyId: string; razorpayOrderId: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; email: string; contact: string } };
type CheckoutSuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutFailure = { error?: { description?: string } };

type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: (r: CheckoutFailure) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | undefined;
/** Loads Razorpay Standard Checkout once per page. A failed load can be retried. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = undefined;
      el.remove();
      reject(new Error("load"));
    };
    document.head.append(el);
  });
  return scriptPromise;
}

type Phase = "idle" | "starting" | "open" | "verifying" | "failed" | "dismissed";

const post = async (url: string, body: unknown) => {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
};

/**
 * The pay button for one order. It never decides that an order is paid: it opens Razorpay Checkout, hands the result
 * to our server for verification, and then shows the status page, which reads the order's real state.
 */
export function RazorpayPay({ orderNumber, token, amount, currency, label = "Pay securely" }: { orderNumber: string; token: string; amount: number; currency: string; label?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "failed" || phase === "dismissed") noteRef.current?.focus();
  }, [phase]);

  const statusUrl = `/checkout/status?o=${encodeURIComponent(orderNumber)}&t=${encodeURIComponent(token)}`;

  async function verify(r: CheckoutSuccess) {
    setPhase("verifying");
    try {
      const { ok, data } = await post("/api/payments/razorpay/verify", { orderNumber, token, ...r });
      if (!ok) {
        setMessage(String(data.message ?? "We could not verify this payment."));
        setPhase("failed");
        busy.current = false;
        return;
      }
      router.push(statusUrl);
    } catch {
      // The payment may well have gone through: the status page and our webhook will settle it.
      router.push(statusUrl);
    }
  }

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setMessage("");
    setPhase("starting");
    try {
      const { ok, data } = await post("/api/payments/razorpay/order", { orderNumber, token });
      if (!ok) throw new Error(String(data.message ?? "We could not start the payment."));
      const session = data as unknown as Session;
      if (session.alreadyPaid) {
        router.push(statusUrl);
        return;
      }
      await loadCheckout().catch(() => {
        throw new Error("Could not load the secure payment window. Check your connection and try again.");
      });
      const rzp = new window.Razorpay!({
        key: session.keyId,
        order_id: session.razorpayOrderId,
        amount: session.amount,
        currency: session.currency,
        name: session.name,
        description: session.description,
        prefill: session.prefill,
        theme: { color: "#262e86" },
        handler: (r: CheckoutSuccess) => void verify(r),
        modal: {
          escape: true,
          ondismiss: () => {
            setPhase("dismissed");
            busy.current = false;
          },
        },
      });
      rzp.on("payment.failed", (r) => {
        setMessage(r.error?.description ? `${r.error.description}.` : "The payment did not go through.");
        setPhase("failed");
        busy.current = false;
      });
      setPhase("open");
      rzp.open();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "We could not start the payment.");
      setPhase("failed");
      busy.current = false;
    }
  }

  const working = phase === "starting" || phase === "open" || phase === "verifying";
  const text = { idle: `${label} · ${formatPrice(amount / 100, currency)}`, starting: "Starting secure payment…", open: "Complete the payment in the window…", verifying: "Confirming your payment…", failed: `Try again · ${formatPrice(amount / 100, currency)}`, dismissed: `Resume payment · ${formatPrice(amount / 100, currency)}` }[phase];

  return (
    <div>
      {(phase === "failed" || phase === "dismissed") && (
        <div ref={noteRef} tabIndex={-1} role={phase === "failed" ? "alert" : "status"} className="mb-4 flex gap-3 border border-line bg-paper p-4 text-sm outline-none">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <p>{phase === "failed" ? `${message} You have not been charged for a failed attempt. You can try again.` : "The payment window was closed and nothing was charged. Your order is saved, so you can pay when you are ready."}</p>
        </div>
      )}
      <button type="button" onClick={start} disabled={working} aria-busy={working} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-indigo px-6 font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-70">
        {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        {text}
      </button>
      <p className="mt-3 text-center text-xs text-muted">Payments are processed by Razorpay (UPI, cards, netbanking, wallets). We never see or store your card or UPI details.</p>
    </div>
  );
}
