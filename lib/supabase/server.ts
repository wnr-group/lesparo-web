import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { serverEnv } from "@/lib/env";

/** Request-scoped client acting as the signed-in user (or anon). RLS applies. */
export async function createClient() {
  // Session-scoped by definition: never prerender (the auth client reads the clock).
  await connection();
  const env = serverEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; proxy.ts refreshes them.
        }
      },
    },
  });
}

/** Cookie-free anon client for public catalogue reads (cache-friendly). RLS applies. */
export function createPublicClient() {
  const env = serverEnv();
  return createPlainClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client. Bypasses RLS — use only inside server services after the
 * caller has been validated/authorised (enquiry submission, job processing, signed URLs).
 */
export function createServiceClient() {
  const env = serverEnv();
  return createPlainClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function publicMediaUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  return `${serverEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${storagePath}`;
}
