import Image from "next/image";
import { asset } from "@/lib/assets";

/** The bird and the LESPARO name side by side, centred on each other (the same pieces as the site header). */
export function BrandLogo({ size = "sm", priority = false }: { size?: "sm" | "lg"; priority?: boolean }) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex items-center ${lg ? "gap-3" : "gap-2.5"}`}>
      <Image src={asset("/lesparo-logo-bird.png")} alt="" width={270} height={350} priority={priority} className={`${lg ? "h-14" : "h-10"} w-auto`} />
      {/* The name artwork carries the registered mark above its box, so it is lifted to put the box level with the bird. */}
      <Image src={asset("/lesparo-wordmark.png")} alt="LESPARO" width={700} height={205} priority={priority} className={`-translate-y-[13%] ${lg ? "h-7" : "h-5"} w-auto`} />
    </span>
  );
}
