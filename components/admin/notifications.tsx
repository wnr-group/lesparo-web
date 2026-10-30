"use client";

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { markAllEnquiriesSeen, markEnquirySeen } from "@/app/admin/(panel)/enquiries/actions";

export type Notifications = { count: number; items: { id: string; number: string; name: string; at: string }[] };

/** One shared copy, so the bell in the top bar and the badge in the sidebar always agree. null until the bell has mounted. */
let current: Notifications | null = null;
const subscribers = new Set<() => void>();
const publish = (next: Notifications) => {
  current = next;
  subscribers.forEach((notify) => notify());
};
const subscribe = (notify: () => void) => {
  subscribers.add(notify);
  return () => void subscribers.delete(notify);
};

/** Fetches the current counts now and shares them with the bell and the sidebar badge. */
export async function refreshNotifications() {
  try {
    const res = await fetch("/api/admin/notifications", { cache: "no-store" });
    if (res.ok) publish((await res.json()) as Notifications);
  } catch {
    // Offline or restarting: the bell's next poll will catch up.
  }
}

/** Rendered on an enquiry's page: opening it marks its notification as read. */
export function MarkSeen({ id }: { id: string }) {
  useEffect(() => {
    void markEnquirySeen(id).then(refreshNotifications);
  }, [id]);
  return null;
}

export const useNotifications = () => useSyncExternalStore(subscribe, () => current, () => null);

const POLL_MS = 30_000;
const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** The bell: a count of enquiries nobody has picked up, a list of the latest, and a banner the moment a new one arrives. */
export function NotificationBell({ initial }: { initial: Notifications }) {
  const data = useNotifications() ?? initial;
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notifications["items"][number] | null>(null);
  const seen = useRef(new Set(initial.items.map((i) => i.id)));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publish(initial);
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/notifications", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const next = (await res.json()) as Notifications;
        const fresh = next.items.find((i) => !seen.current.has(i.id));
        next.items.forEach((i) => seen.current.add(i.id));
        if (fresh) setToast(fresh);
        publish(next);
      } catch {
        // Offline or the server restarting: try again on the next tick.
      }
    };
    const timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={data.count ? `${data.count} unread enquir${data.count === 1 ? "y" : "ies"}` : "Notifications, none unread"}
        className="relative grid size-9 place-items-center rounded-full border border-line bg-plate text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        <Bell className="size-4" aria-hidden />
        {data.count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-5 text-white">{data.count > 99 ? "99+" : data.count}</span>}
      </button>

      {open && (
        <div role="region" aria-label="New enquiries" className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] border border-line bg-plate shadow-[0_24px_50px_-24px_rgb(18_22_76/0.4)]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">{data.count ? `${data.count} unread enquir${data.count === 1 ? "y" : "ies"}` : "No unread enquiries"}</span>
            {data.count > 0 && (
              <button
                type="button"
                onClick={() => {
                  publish({ count: 0, items: [] });
                  void markAllEnquiriesSeen().then(refreshNotifications);
                }}
                className="text-xs font-medium text-indigo hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          {data.items.length > 0 ? (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {data.items.map((n) => (
                <li key={n.id}>
                  <Link href={`/admin/enquiries/${n.id}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-ivory">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium tabular-nums text-indigo">{n.number}</span>
                      <span className="shrink-0 text-xs text-muted">{when.format(new Date(n.at))}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-soft">{n.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-muted">You are all caught up. New wholesale enquiries appear here as soon as they arrive, and clear once you open them.</p>
          )}
          <Link href="/admin/enquiries?status=new" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-indigo hover:bg-ivory">
            View all enquiries
          </Link>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed right-4 top-16 z-40 flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 border border-line bg-plate p-4 shadow-[0_24px_50px_-24px_rgb(18_22_76/0.5)] motion-safe:animate-[rise_0.4s_var(--ease-out-soft)]">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-indigo text-white">
            <Bell className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">New enquiry received</p>
            <p className="mt-0.5 truncate text-ink-soft">
              {toast.number} · {toast.name}
            </p>
            <Link href={`/admin/enquiries/${toast.id}`} onClick={() => setToast(null)} className="mt-2 inline-block font-medium text-indigo hover:underline">
              Open enquiry →
            </Link>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
