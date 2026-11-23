/** Only same-site paths are honoured after sign-in, never an external address or the staff area. */
export function safeNext(next: unknown, fallback = "/account") {
  return typeof next === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) && !next.startsWith("/admin") ? next : fallback;
}
