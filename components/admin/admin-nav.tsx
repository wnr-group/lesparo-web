"use client";

import clsx from "clsx";
import { FolderTree, Home, Inbox, LayoutDashboard, Package, ShoppingBag, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "./notifications";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/enquiries", label: "Wholesale enquiries", icon: Inbox },
  { href: "/admin/orders", label: "Retail orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/pricing", label: "Pricing", icon: Tag },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/content", label: "Homepage", icon: Home },
];

export function AdminNav() {
  const pathname = usePathname();
  const unread = useNotifications()?.count ?? 0;
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-indigo font-medium text-paper shadow-sm" : "text-ink-soft hover:bg-linen hover:text-ink")}
              >
                <Icon className="size-[1.05rem]" aria-hidden />
                {label}
                {href === "/admin/enquiries" && unread > 0 && (
                  <span className={clsx("ml-auto grid min-w-5 place-items-center rounded-full px-1.5 text-[0.68rem] font-bold leading-5", active ? "bg-white text-indigo" : "bg-danger text-white")}>{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
