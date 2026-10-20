import { ViewTransition } from "react";

/**
 * Templates remount on every route change, so each page gets a view-transition exit/enter
 * (styles in globals.css). Query-string changes such as shop filters stay on the same
 * template and do not animate the whole page.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
