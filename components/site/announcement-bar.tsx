import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BUSINESS } from "@/lib/business";

/**
 * A slim strip above the header that rolls through what a buyer needs first, one message at a time (the .ticker
 * styles in globals.css). Facts come from lib/business and the wholesale page, nothing invented: no offers or shipping
 * promises until the shipping and returns policy is confirmed. The first message is repeated at the end so the loop is seamless.
 */
export function AnnouncementBar() {
  const messages = [
    { key: "shop", body: <>Gents & kids wear, now online · <Link href="/shop" className="inline-flex items-center gap-1 underline decoration-sun underline-offset-4 hover:text-sun">shop online <ArrowRight className="size-3" aria-hidden /></Link></> },
    { key: "trade", body: <>Supplying showrooms across Tamil Nadu, Kerala & Karnataka · <Link href="/wholesale#enquire" className="underline decoration-sun underline-offset-4 hover:text-sun">Get a wholesale quote</Link></> },
    { key: "care", body: <>Customer care <a href={BUSINESS.customerCare.href} className="font-sport font-bold italic tabular-nums text-sun hover:underline">{BUSINESS.customerCare.display}</a> · {BUSINESS.customerCare.hours}</> },
  ];
  return (
    <div className="bg-indigo-deep text-white">
      <div className="ticker mx-auto max-w-page px-4 text-center text-[0.74rem] font-semibold tracking-wide sm:text-[0.8rem]" style={{ marginBlock: "0.4rem" }}>
        <ul>
          {[...messages, { ...messages[0], key: "loop" }].map((m, i) => (
            // The repeated first message is only there for the loop: hidden from assistive tech and the tab order.
            <li key={m.key} aria-hidden={i === messages.length || undefined} inert={i === messages.length || undefined} className="flex items-center justify-center truncate leading-6">
              <span className="truncate">{m.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
