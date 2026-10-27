import { ArrowRight, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BrandFilm } from "@/components/site/brand-film";
import { SpotlightHero, type TurntableSet } from "@/components/site/spotlight-hero/spotlight-hero";
import { ErodeRoute } from "@/components/site/erode-route";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { BUSINESS } from "@/lib/business";
import { getCategoryTree, getHomepageContent, listProducts, type CategoryNode } from "@/lib/catalogue/queries";

const STEPS = [
  ["Browse", "Add products to your enquiry list as you explore the catalogue."],
  ["Specify", "Share quantities, sizes, colours and any reference images."],
  ["Review", "Our sales team reviews your requirement and follows up."],
  ["Quotation", "Receive pricing and supply details for your order."],
];

function CategoryTile({ category, square, sizes }: { category: CategoryNode; square?: boolean; sizes: string }) {
  return (
    <Link href={`/collections/${category.slug}`} className="group flex h-full flex-col">
      <div className={`relative overflow-hidden rounded-2xl bg-mist transition-colors duration-500 group-hover:bg-[#e8eaf2] ${square ? "aspect-square" : "aspect-[4/5]"}`}>
        {category.coverUrl && (
          <Image
            src={category.coverUrl}
            alt=""
            fill
            sizes={sizes}
            className="object-contain p-[8%] cutout transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]"
          />
        )}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-0.5 pt-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold tracking-tight transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1 sm:text-2xl">{category.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{category.children.map((g) => g.name).join(" · ") || "View range"}</p>
        </div>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-paper ring-1 ring-line transition-colors duration-300 group-hover:bg-indigo group-hover:text-white group-hover:ring-indigo sm:flex">
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:rotate-45" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** A real 3D garment: public/models/<id>.glb (pants.glb, tee.glb). When present it replaces the photo viewer. */
function model3d(id: string): string | undefined {
  return existsSync(join(process.cwd(), "public", "models", `${id}.glb`)) ? `/models/${id}.glb` : undefined;
}

/**
 * A product with a real 360-degree turntable set: 8 or more frames in public/turntable/<id>/ (sorted by file
 * name), plus an optional hotspots.json of { frame, x, y, label }. Products without one use stand-in photos.
 */
function turntable(id: string): TurntableSet | undefined {
  const dir = join(process.cwd(), "public", "turntable", id);
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();
  if (files.length < 8) return undefined;
  let spots: TurntableSet["spots"] = [];
  try {
    spots = JSON.parse(readFileSync(join(dir, "hotspots.json"), "utf8"));
  } catch {}
  return { frames: files.map((f) => `/turntable/${id}/${f}`), spots };
}

/** A photograph of a catalogue model, used by the quality section. */
type LineupModel = { id: string; slug: string; name: string; image: string; kid?: boolean };

export default async function HomePage() {
  const [content, tree] = await Promise.all([getHomepageContent(), getCategoryTree()]);
  const fabrics = tree.find((t) => t.slug !== "garments");
  const featuredCategories = tree.flatMap((t) => t.children).filter((c) => content.featuredCategorySlugs.includes(c.slug));
  const { sections } = content;
  const showcase = (featuredCategories.length ? featuredCategories : tree.flatMap((t) => t.children)).slice(0, 4);
  // Hero line-up: full-length model photos from the catalogue, kids drawn smaller (falls back to any garment photos).
  const { products: catalogue } = await listProducts({ pageSize: 200 });
  const bySlug = new Map(catalogue.map((p) => [p.slug, p]));
  const pick = (slug: string, kid = false): LineupModel[] => {
    const p = bySlug.get(slug);
    return p?.images[0] ? [{ id: p.id, slug: p.slug, name: p.name, image: p.images[0].url, kid }] : [];
  };
  const lineup: LineupModel[] = [
    ...pick("loom-kids", true),
    ...pick("fine-comfort-34-th"),
    ...pick("loom-don-track-with-rib"),
    ...pick("fine-comfort-track"),
    ...pick("new-york-kids-track", true),
  ];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <SpotlightHero eyebrow={content.hero.eyebrow || "Abija Exports · Erode, Tamil Nadu"} heading={content.hero.heading} subheading={content.hero.subheading} cta={{ label: "Shop now", href: "/collections/gents-tracks" }} secondary={{ label: "Wholesale enquiry", href: "/wholesale#enquire" }} turntables={{ pants: turntable("pants"), tee: turntable("tee") }} models={{ pants: model3d("pants"), tee: model3d("tee") }} />

      {/* ---------------------------------------------------------------- film */}
      <BrandFilm src="/lesparo_video.mp4" title="The LESPARO film" />

      {/* ---------------------------------------------------------- categories */}
      {sections.categories && (
        <section className="py-20 lg:py-28">
          <Container>
            <SectionHeading
              eyebrow="Collections"
              title={
                <>
                  Garments, and the cloth <span className="text-indigo">behind them</span>
                </>
              }
              action={
                <ButtonLink href="/collections" variant="secondary" size="sm" className="self-start md:self-auto">
                  All collections <ArrowRight className="size-3.5" aria-hidden />
                </ButtonLink>
              }
            />
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {showcase.map((c, i) => (
                <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }}>
                  <CategoryTile category={c} sizes="(min-width:768px) 22vw, 45vw" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ------------------------------------------------------------ lookbook film */}
      <BrandFilm src="/lesparo-video-1.mp4" title="The LESPARO lookbook" />

      {/* ----------------------------------------------------- where we supply */}
      <ErodeRoute />

      {/* ------------------------------------------------------- quality promise */}
      {sections.story && (
        <section aria-labelledby="quality-heading" className="bg-white py-20 lg:py-32">
          <Container>
            <div className="grid items-stretch gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col justify-center lg:col-span-7">
                <p data-reveal="up" className="eyebrow">
                  Quality promise
                </p>
                <h2 id="quality-heading" data-reveal="mask" style={{ ["--delay" as string]: "80ms" }} className="mt-5 font-display text-[clamp(2.3rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.96] tracking-[-0.045em]">
                  Good-quality wearables, and an <span className="text-indigo">unforgettable wearing experience.</span>
                </h2>
                <ul data-reveal="stagger" style={{ ["--delay" as string]: "200ms" }} className="mt-10 divide-y divide-line border-y border-line">
                  {[
                    { icon: ShieldCheck, title: "Quality policy", text: "We commit to the agreed requirement, details and price, and to customer satisfaction through quality procedures that meet or exceed international standards." },
                    { icon: RefreshCw, title: "Replacement policy", text: "Our replacement policy speaks to our quality assurance: we make every effort to meet international quality, to a high standard of quality parameters." },
                  ].map(({ icon: Icon, title, text }) => (
                    <li key={title} className="flex gap-5 py-6">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-soft">
                        <Icon className="size-5 text-indigo" aria-hidden />
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
                        <p className="mt-1.5 max-w-xl leading-relaxed text-ink-soft">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div data-reveal="up" className="mt-8">
                  <ButtonLink href="/about" variant="secondary">
                    About LESPARO <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
              </div>

              {/* One calm panel: the range standing together. */}
              <div data-reveal="clip" className="relative min-h-[26rem] overflow-hidden rounded-[2rem] bg-[#eef0ff] lg:col-span-5 lg:min-h-[34rem]">
                <p className="absolute left-6 top-6 z-10 rounded-full bg-white px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-indigo shadow-sm">Abija Exports · Erode</p>
                {lineup.find((l) => !l.kid) && (
                  <div className="absolute bottom-0 right-[4%] h-[90%] w-[78%]">
                    <Image src={lineup.find((l) => !l.kid)!.image} alt="" fill sizes="(min-width:1024px) 26vw, 70vw" className="cutout object-contain object-bottom" />
                  </div>
                )}
                {lineup.find((l) => l.kid) && (
                  <div className="absolute bottom-0 left-[2%] z-10 h-[56%] w-[40%] mix-blend-multiply">
                    <Image src={lineup.find((l) => l.kid)!.image} alt="" fill sizes="(min-width:1024px) 14vw, 36vw" className="cutout object-contain object-bottom" />
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ------------------------------------------------------------- fabrics */}
      {sections.fabrics && fabrics && (
        <section className="relative isolate overflow-hidden py-20 lg:py-28">
          {/* Oversized outline type drifts sideways behind the tiles as the section scrolls past. */}
          <p
            aria-hidden
            className="ghost-drift pointer-events-none absolute bottom-[8%] left-0 -z-10 select-none whitespace-nowrap font-display text-[clamp(6rem,4rem+12vw,15rem)] font-bold leading-none tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_var(--color-sand)]"
          >
            {fabrics.children.map((c) => c.name).join(" · ")}
          </p>
          <Container>
            <SectionHeading eyebrow={fabrics.name} title="Lungi, kavi, towel and kerchief" intro="Woven fabric lines from the family’s original trade, continued under LESPARO." />
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {fabrics.children.map((c, i) => (
                <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }}>
                  <CategoryTile category={c} square sizes="(min-width:768px) 22vw, 45vw" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ----------------------------------------------------------- wholesale */}
      {sections.wholesale && (
        <section className="py-20 lg:py-28">
          <Container>
            {/* The panel opens out from an inset window as it enters, then its steps follow in sequence. */}
            <div data-reveal="clip" className="relative isolate overflow-hidden rounded-[2rem] bg-indigo px-6 py-14 text-white sm:px-12 lg:px-16 lg:py-20">
              <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[30rem] rounded-full bg-sun opacity-25 blur-[110px]" />
              <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[26rem] rounded-full bg-indigo-deep opacity-80 blur-[90px]" />
              <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <p className="eyebrow !text-sun">Wholesale</p>
                  <h2 className="mt-4 font-display text-headline font-bold">Supplying showrooms, retailers and wholesalers.</h2>
                  <p className="mt-6 max-w-lg leading-relaxed text-white/75">
                    LESPARO supplies textile showrooms across Tamil Nadu, Kerala and Karnataka. Tell us what you need — products, quantities, sizes and colours — and our sales team will come back to
                    you with a quotation.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <ButtonLink href="/wholesale#enquire" size="lg" variant="accent">
                      Request a quote <ArrowRight className="size-4" aria-hidden />
                    </ButtonLink>
                    <a href={BUSINESS.phone.href} className="inline-flex h-13 items-center px-3 text-sm font-medium text-white/80 hover:text-white">
                      or call {BUSINESS.phone.display}
                    </a>
                  </div>
                </div>
                <ol data-reveal="stagger" style={{ ["--delay" as string]: "350ms" }} className="grid gap-3 self-center sm:grid-cols-2">
                  {STEPS.map(([t, d], i) => (
                    <li key={t} className="rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/15 backdrop-blur">
                      <span className="flex size-8 items-center justify-center rounded-full bg-sun text-sm font-bold text-ink">{i + 1}</span>
                      <p className="mt-4 font-display text-2xl font-bold">{t}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/70">{d}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
