"use client";

import clsx from "clsx";
import { FolderTree, Home, Inbox, LayoutDashboard, Package, ShoppingBag, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex items-center gap-3 whitespace-nowrap px-3 py-2 text-sm transition-colors", active ? "bg-indigo text-paper" : "text-ink-soft hover:bg-linen hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
