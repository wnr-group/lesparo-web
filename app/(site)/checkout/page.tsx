import type { Metadata } from "next";
import { CheckoutForm } from "@/components/site/checkout-form";
import { Container } from "@/components/ui/primitives";
import { placeOrderAction } from "./actions";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Retail</p>
      <h1 className="mt-3 font-display text-headline font-bold">Checkout</h1>
      <CheckoutForm action={placeOrderAction} />
    </Container>
  );
}
