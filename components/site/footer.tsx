import Image from "next/image";
import Link from "next/link";
import { BUSINESS, formattedAddress } from "@/lib/business";
import { getCategoryTree } from "@/lib/catalogue/queries";

export async function Footer() {
  const tree = await getCategoryTree();
  const collections = tree.flatMap((t) => [t, ...t.children]);

  return (
    <footer className="mt-auto">
      {/* Call-to-action band: one last route to buy before the page ends. */}
      <div className="bg-[#f2f3f5]">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-5 px-4 py-10 sm:px-6 lg:px-10">
          <p className="font-display text-[clamp(1.6rem,1rem+2vw,2.6rem)] font-extrabold uppercase leading-tight tracking-tight text-ink">Stocking a showroom? Get a quote.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/wholesale#enquire" className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-bold text-white transition-colors hover:bg-indigo-deep">
              Request a quote
            </Link>
            <a href={BUSINESS.phone.href} className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-bold text-ink shadow-sm hover:bg-ink hover:text-white">
              Call {BUSINESS.phone.display}
            </a>
          </div>
        </div>
      </div>
      <div className="overflow-hidden bg-indigo-deep text-paper/80">
      <div className="mx-auto grid max-w-page gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <div className="inline-block rounded-2xl bg-white p-3">
            <Image src="/lesparo-logo-v2.png" alt="LESPARO" width={900} height={484} className="h-20 w-auto" />
          </div>
          <p className="mt-6 max-w-xs font-display text-3xl font-bold tracking-tight text-white">{BUSINESS.tagline}</p>
          <address className="mt-6 text-sm not-italic leading-relaxed">
            {BUSINESS.displayName}
            {formattedAddress().map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white/55">Collections</h2>
          <ul className="mt-5 space-y-2.5 text-sm">
            {collections.map((c) => (
              <li key={c.id}>
                <Link href={`/collections/${c.slug}`} className="link-draw hover:text-paper">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white/55">Company</h2>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              ["About LESPARO", "/about"],
              ["Wholesale enquiries", "/wholesale"],
              ["Contact", "/contact"],
              ["Quality policy", "/policies/quality"],
              ["Terms of use", "/policies/terms"],
              ["Privacy", "/policies/privacy"],
              ["Shipping & returns", "/policies/shipping-returns"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="link-draw hover:text-paper">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em] text-white/55">Talk to us</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <span className="block text-paper/50">Office</span>
              <a href={BUSINESS.phone.href} className="link-draw text-paper">
                {BUSINESS.phone.display}
              </a>
            </li>
            <li>
              <span className="block text-paper/50">Customer care · {BUSINESS.customerCare.hours}</span>
              <a href={BUSINESS.customerCare.href} className="link-draw text-paper">
                {BUSINESS.customerCare.display}
              </a>
            </li>
            <li>
              <span className="block text-paper/50">Email</span>
              <a href={`mailto:${BUSINESS.email}`} className="link-draw break-all text-paper">
                {BUSINESS.email}
              </a>
            </li>
          </ul>
          <ul className="mt-6 flex gap-5 text-sm">
            {BUSINESS.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-draw text-paper">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none -mb-[0.18em] select-none text-center font-display text-[clamp(4rem,2rem+17vw,17rem)] font-extrabold leading-none tracking-tight text-white/[0.05]">
        LESPARO
      </p>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-page px-4 py-6 text-xs text-paper/50 sm:px-6 lg:px-10">LESPARO is a device trademark of Y. Sathish, trading as Abija Exports (Application 3620885, Class 25).</p>
      </div>
      </div>
    </footer>
  );
}
