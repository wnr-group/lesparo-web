import { ArrowRight, MoveHorizontal } from "lucide-react";
import { Fragment } from "react";
import { ProductRing, type RingItem } from "@/components/site/product-ring";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

type Cta = { label: string; href: string };

/**
 * Homepage banner, 3D: the headline's words flip up in perspective (the last word in raised 3D
 * lettering), then real products turn on a draggable 3D ring below. Motion is CSS plus the
 * ring's own loop; everything is still for reduced motion.
 */
export function HeroRing({ eyebrow, heading, subheading, primaryCta, secondaryCta, items }: { eyebrow: string; heading: string; subheading: string; primaryCta: Cta; secondaryCta: Cta; items: RingItem[] }) {
  const words = heading.split(/\s+/);
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(120%_70%_at_50%_100%,var(--color-indigo-soft),#fff_65%)]">
      <Container className="pt-12 text-center lg:pt-14">
        <p className="eyebrow motion-safe:animate-rise">{eyebrow}</p>
        <h1 className="word-flip mx-auto mt-5 max-w-5xl font-display text-[clamp(2.6rem,1.3rem+4.4vw,5.75rem)] font-extrabold leading-[1] tracking-[-0.04em] text-ink">
          {words.map((w, i) => (
            <Fragment key={i}>
              <span style={{ ["--i" as string]: i }} className={i === words.length - 1 ? "text-3d text-sun" : undefined}>
                {w}
              </span>
              {i < words.length - 1 && " "}
            </Fragment>
          ))}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft motion-safe:animate-[rise_0.9s_0.7s_var(--ease-out-soft)_both]">{subheading}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 motion-safe:animate-[rise_0.9s_0.8s_var(--ease-out-soft)_both]">
          <ButtonLink href={primaryCta.href} size="lg">
            {primaryCta.label} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" aria-hidden />
          </ButtonLink>
          <ButtonLink href={secondaryCta.href} size="lg" variant="secondary">
            {secondaryCta.label}
          </ButtonLink>
        </div>
      </Container>

      <div className="-mt-2 motion-safe:animate-[rise_1.2s_0.6s_var(--ease-out-soft)_both] lg:-mt-4">
        <ProductRing items={items} />
      </div>
      <p className="relative z-10 flex items-center justify-center gap-2 pb-10 pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <MoveHorizontal className="size-4" aria-hidden /> Drag to turn
      </p>
    </section>
  );
}
