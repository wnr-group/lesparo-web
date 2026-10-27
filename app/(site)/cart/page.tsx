import type { Metadata } from "next";
import { CartView } from "@/components/site/cart-view";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Retail</p>
      <h1 className="mt-3 font-display text-headline font-bold">Your cart</h1>
      <CartView />
    </Container>
  );
}
