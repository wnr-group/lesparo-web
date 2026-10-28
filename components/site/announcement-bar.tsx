import { BUSINESS } from "@/lib/business";

/** A slim strip above the header with what a buyer needs first. Facts come from lib/business, nothing invented. */
export function AnnouncementBar() {
  return (
    <div className="bg-sun text-ink">
      <p className="mx-auto flex max-w-page items-center justify-center gap-x-4 gap-y-0.5 px-4 py-2 text-center text-[0.72rem] font-semibold tracking-wide sm:text-[0.8rem]">
        <span>Wholesale supply from Erode, Tamil Nadu</span>
        <span aria-hidden className="hidden text-ink/50 sm:inline">
          ·
        </span>
        <a href={BUSINESS.phone.href} className="hidden hover:underline sm:inline">
          Call {BUSINESS.phone.display}
        </a>
      </p>
    </div>
  );
}
