import type { Metadata } from "next";
import { Hero3D } from "@/components/site/hero3d/hero-3d";

// A preview of the 3D hero, kept off the homepage and out of search until it is approved.
export const metadata: Metadata = { title: "3D hero preview", robots: { index: false } };

export default function Hero3DPreview() {
  return (
    <Hero3D
      heading="Everyday Comfort. Distinctly LESPARO."
      subheading="Thoughtfully designed essentials for everyday living."
      cta={{ label: "Explore Collection", href: "/shop" }}
      secondary={{ label: "Discover LESPARO", href: "/about" }}
      // Temporary 3D asset: a figure generated from a LESPARO shoot photograph (beige T-shirt, brown cargo track pants).
      model="/models/figure.glb"
      poster="/spotlight/model.webp"
      modelLabel="LESPARO T-shirt and track pants"
    />
  );
}
