import Image from "next/image";
import { ClipVideo } from "@/components/site/clip-video";
import type { ReactNode } from "react";

/** Studio photographs from the LESPARO shoot, in public/collections. `pos` keeps the subject in frame when the portrait is cropped wide. */
const PHOTOS: Record<string, { src: string; pos: string }> = {
  garments: { src: "/collections/garments.jpg", pos: "50% 30%" },
  gents: { src: "/collections/gents.jpg", pos: "50% 28%" },
  kids: { src: "/collections/kids.jpg", pos: "50% 25%" },
  tracks: { src: "/collections/tracks.jpg", pos: "50% 82%" },
  shorts: { src: "/collections/shorts.jpg", pos: "50% 60%" },
  "three-quarter": { src: "/collections/three-quarter.jpg", pos: "50% 55%" },
  fabric: { src: "/collections/fabric.jpg", pos: "50% 35%" },
  lungi: { src: "/collections/lungi.jpg", pos: "50% 35%" },
  kavi: { src: "/collections/kavi.jpg", pos: "50% 40%" },
  towels: { src: "/collections/towels.jpg", pos: "50% 35%" },
  kerchief: { src: "/collections/kerchief.jpg", pos: "50% 30%" },
  range: { src: "/collections/range.jpg", pos: "50% 35%" },
  about: { src: "/collections/about-hero.jpg", pos: "50% 0%" },
  contact: { src: "/collections/contact-banner.jpg", pos: "50% 18%" },
};

/** Lifestyle banner artwork for the kids and fabric collections (public/collections/banner-*.jpg). The dark left side of each is left clear for the title. */
const COVERS: { match: string; src: string; pos: string }[] = [
  { match: "kerchief", src: "/collections/banner-kerchief.jpg", pos: "64% 40%" },
  { match: "towel", src: "/collections/banner-towels.jpg", pos: "75% 50%" },
  { match: "kavi", src: "/collections/banner-kavi.jpg", pos: "64% 50%" },
  { match: "lungi", src: "/collections/banner-lungi.jpg", pos: "64% 40%" },
  { match: "kids", src: "/collections/banner-kids.jpg", pos: "72% 40%" },
];
const coverFor = (slug?: string) => (slug ? COVERS.find((c) => slug.includes(c.match)) : undefined);

/** Only the gents garment ranges have a model photograph from the shoot; every other collection shows its own products. */
const PHOTO_SLUGS: Record<string, string> = { about: "about", contact: "contact", garments: "garments", gents: "gents", "gents-tracks": "tracks", "gents-shorts": "shorts" };
export const hasPhoto = (slug?: string) => !slug || slug in PHOTO_SLUGS;

/** Which photograph a collection slug gets (see hasPhoto). */
export function photoFor(slug?: string) {
  return PHOTOS[(slug && PHOTO_SLUGS[slug]) || "range"];
}

/**
 * A wide banner: text on a warm charcoal panel, and on the right either a studio photograph (the gents garment ranges)
 * or the collection's own product images standing on a stone panel (kids, 3/4ths, lungi, kavi, towels, kerchiefs).
 */
export function CollectionBanner({ slug, products, video, clip, children }: { slug?: string; products?: { src: string; alt: string }[]; video?: string; clip?: [number, number]; children: ReactNode }) {
  const photo = photoFor(slug);
  const cover = !video ? coverFor(slug) : undefined;
  const own = !video && !cover && !hasPhoto(slug) && products && products.length > 0 ? products.slice(0, 3) : null;
  return (
    <section className="mx-auto max-w-page px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <div className={`relative isolate grid overflow-clip rounded-[1.6rem] bg-[#22231f] text-white lg:min-h-[26rem] ${video || cover ? "" : "lg:grid-cols-[1fr_1.1fr]"}`}>
        {/* Artwork banners cover the whole panel; a soft gradient keeps the title readable over any crop. */}
        {cover && (
          <>
            {/* unoptimized: the artwork is already HD, and the image optimiser would re-encode it at 1920px and quality 75, which visibly softens it. */}
            <Image src={cover.src} alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover" style={{ objectPosition: cover.pos }} />
            <span aria-hidden className="absolute inset-0 -z-[5] bg-gradient-to-r from-[#22231f]/80 via-[#22231f]/25 to-transparent" />
          </>
        )}
        {/* A promo film covers the whole banner; a gradient keeps the text on the left readable. Reduced motion keeps the photograph. */}
        {video && (
          <>
            <Image src={photo.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: photo.pos }} />
            {clip ? (
              <ClipVideo src={video} poster={photo.src} start={clip[0]} end={clip[1]} className="absolute inset-0 -z-10 size-full object-cover motion-reduce:hidden" />
            ) : (
              <video src={video} poster={photo.src} autoPlay muted loop playsInline preload="metadata" aria-hidden className="absolute inset-0 -z-10 size-full object-cover motion-reduce:hidden" />
            )}
            <span aria-hidden className="absolute inset-0 -z-[5] bg-gradient-to-r from-[#22231f]/90 via-[#22231f]/45 to-transparent" />
          </>
        )}
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 lg:py-14">{children}</div>
        {video || cover ? null : own ? (
          <div className="relative flex min-h-64 items-end justify-center gap-2 overflow-clip bg-[#f2f3f5] px-4 pt-8 sm:gap-4 lg:min-h-0 lg:px-8">
            {own.map((p, i) => (
              <div key={p.src} className={`relative h-[16rem] min-w-0 flex-1 sm:h-[20rem] lg:h-[24rem] ${i === 1 ? "lg:h-[26rem]" : ""}`}>
                <Image src={p.src} alt={p.alt} fill priority={i === 0} sizes="(min-width:1024px) 18vw, 30vw" className="cutout object-contain object-bottom" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative min-h-64 overflow-clip lg:min-h-0">
            <Image src={photo.src} alt="" fill priority sizes="(min-width:1024px) 55vw, 100vw" className="scrub-parallax object-cover" style={{ objectPosition: photo.pos }} />
            {/* Fades the photograph into the text panel so there is no hard seam. */}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#22231f] via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
        )}
      </div>
    </section>
  );
}
