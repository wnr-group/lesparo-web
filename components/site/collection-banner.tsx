import Image from "next/image";
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
};

/** Which photograph a collection slug gets. */
export function photoFor(slug?: string) {
  if (!slug) return PHOTOS.range;
  // Most specific first: "gents-tracks" is a track-pants banner, not the generic gents one.
  const rules: [string, string][] = [["track", "tracks"], ["shorts", "shorts"], ["3-4", "three-quarter"], ["lungi", "lungi"], ["kavi", "kavi"], ["towel", "towels"], ["kerchief", "kerchief"], ["fabric", "fabric"], ["kids", "kids"], ["gents", "gents"], ["garments", "garments"]];
  const hit = rules.find(([needle]) => slug.includes(needle));
  return PHOTOS[hit ? hit[1] : "range"];
}

/** A wide banner: text on a warm charcoal panel, a studio photograph filling the right side. */
export function CollectionBanner({ slug, children }: { slug?: string; children: ReactNode }) {
  const photo = photoFor(slug);
  return (
    <section className="mx-auto max-w-page px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <div className="relative isolate grid overflow-hidden rounded-[1.6rem] bg-[#22231f] text-white lg:min-h-[26rem] lg:grid-cols-[1fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 lg:py-14">{children}</div>
        <div className="relative min-h-64 lg:min-h-0">
          <Image src={photo.src} alt="" fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" style={{ objectPosition: photo.pos }} />
          {/* Fades the photograph into the text panel so there is no hard seam. */}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#22231f] via-transparent to-transparent lg:bg-gradient-to-r" />
        </div>
      </div>
    </section>
  );
}
