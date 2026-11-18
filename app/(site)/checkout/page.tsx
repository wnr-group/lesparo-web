import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm, type CheckoutPrefill } from "@/components/site/checkout-form";
import { Container } from "@/components/ui/primitives";
import { getCustomer } from "@/lib/auth/customer";
import { razorpayEnabled } from "@/lib/payments/razorpay";
import { listAddresses } from "@/lib/services/customer-account";
import { placeOrderAction } from "./actions";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Signed-in customers get their details and default address filled in; everyone else sees the plain form. */
async function Checkout() {
  const online = razorpayEnabled();
  const me = await getCustomer();
  if (!me) {
    return (
      <>
        <p className="mt-3 text-sm text-ink-soft">
          Have an account?{" "}
          <Link href="/account/login?next=/checkout" className="font-semibold text-indigo hover:underline">
            Sign in
          </Link>{" "}
          to fill this in for you and follow your order. Or just continue as a guest.
        </p>
        <CheckoutForm action={placeOrderAction} onlinePayments={online} />
      </>
    );
  }
  const address = (await listAddresses(me.id))[0];
  const prefill: CheckoutPrefill = { customerName: address?.full_name ?? me.name, phone: address?.phone ?? me.phone, email: me.email, addressLine: address?.line, city: address?.city, state: address?.state, postcode: address?.postcode };
  return <CheckoutForm action={placeOrderAction} onlinePayments={online} prefill={prefill} />;
}

export default function CheckoutPage() {
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Retail</p>
      <h1 className="mt-3 font-display text-headline font-bold">Checkout</h1>
      <Suspense fallback={<CheckoutForm action={placeOrderAction} onlinePayments={razorpayEnabled()} />}>
        <Checkout />
      </Suspense>
    </Container>
  );
}
