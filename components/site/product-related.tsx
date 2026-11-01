import Image from "next/image";
import Link from "next/link";
import type { ProductCard } from "@/lib/catalogue/queries";
import { formatPrice } from "@/lib/format";

/** Quiet editorial tile for "more from this category": photograph on warm stone, name and price beneath, second view on hover. */
export function RelatedProduct({ product }: { product: ProductCard }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f4f1ec]">
        {primary ? (
          <>
            <Image
              src={primary.url}
              alt={primary.alt}
              fill
              sizes="(min-width: 1024px) 23vw, 46vw"
              className={`cutout object-contain p-[6%] transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${secondary ? "group-hover:opacity-0" : ""}`}
            />
            {secondary && <Image src={secondary.url} alt="" aria-hidden fill sizes="(min-width: 1024px) 23vw, 46vw" className="cutout object-contain p-[6%] opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] group-hover:opacity-100" />}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Image coming soon</div>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[0.98rem] font-bold leading-snug tracking-tight">
            <span className="hline">{product.name}</span>
          </h3>
          {product.fabric && <p className="mt-0.5 truncate text-[0.8rem] text-muted">{product.fabric}</p>}
        </div>
        {retail ? <p className="shrink-0 text-[0.95rem] font-semibold tabular-nums">{formatPrice(product.price!, product.currency)}</p> : <p className="shrink-0 text-xs text-muted">On enquiry</p>}
      </div>
    </Link>
  );
}
