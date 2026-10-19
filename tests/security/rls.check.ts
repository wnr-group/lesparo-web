/**
 * Row Level Security / storage / grant checks against a running Supabase (local by default).
 * Uses the real API roles: anon, a sales user and an admin user.
 *
 *   npm run test:security
 *
 * Requires the local staff accounts (see docs/database.md):
 *   SECURITY_ADMIN_EMAIL / SECURITY_ADMIN_PASSWORD, SECURITY_SALES_EMAIL / SECURITY_SALES_PASSWORD
 * Never point this at production: it creates and removes test rows.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.SUPABASE_SECRET_KEY!;
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_REMOTE_SECURITY_CHECK !== "1") {
  console.error("Refusing to run against a non-local Supabase. Set ALLOW_REMOTE_SECURITY_CHECK=1 for a staging project.");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(url, anonKey, opts);
const service = createClient(url, serviceKey, opts);

let failures = 0;
async function check(name: string, fn: () => Promise<boolean>) {
  try {
    const ok = await fn();
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) failures++;
  } catch (err) {
    console.log(`FAIL  ${name} — threw ${(err as Error).message}`);
    failures++;
  }
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(url, anonKey, opts);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function main() {
  const sales = await signIn(process.env.SECURITY_SALES_EMAIL ?? "sales@lesparo.local", process.env.SECURITY_SALES_PASSWORD ?? "local-sales-pass-2026");
  const admin = await signIn(process.env.SECURITY_ADMIN_EMAIL ?? "admin@lesparo.local", process.env.SECURITY_ADMIN_PASSWORD ?? "local-admin-pass-2026");
  const { data: salesUser } = await sales.auth.getUser();

  // Fixtures (service role): an unpublished product and an enquiry with a note + attachment.
  const draftSlug = `security-draft-${Date.now()}`;
  const { data: draft } = await service.from("products").insert({ name: "Security draft", slug: draftSlug, is_published: false }).select("id").single();
  const { data: created } = await service.rpc("create_wholesale_enquiry", {
    p: { idempotency_key: randomUUID(), customer_name: "RLS Test", email: "rls@example.com", phone: "+910000000000", message: "security check", items: [{ product_name: "Test" }] },
  });
  const enquiryId = (created as { id: string }[])[0].id;
  await service.from("enquiry_notes").insert({ enquiry_id: enquiryId, note: "internal only" });
  const attachmentPath = `enquiries/${enquiryId}/${randomUUID()}.pdf`;
  await service.storage.from("enquiry-attachments").upload(attachmentPath, new TextEncoder().encode("%PDF-1.4 test"), { contentType: "application/pdf" });

  try {
    // ---- anonymous visitors --------------------------------------------------------
    await check("anon can read published products", async () => ((await anon.from("products").select("id").eq("is_published", true).limit(1)).data?.length ?? 0) > 0);
    await check("anon cannot see unpublished products", async () => (await anon.from("products").select("id").eq("slug", draftSlug)).data?.length === 0);
    await check("anon cannot read enquiries", async () => {
      const r = await anon.from("wholesale_enquiries").select("id").limit(1);
      return !!r.error || r.data?.length === 0;
    });
    await check("anon cannot read internal notes", async () => {
      const r = await anon.from("enquiry_notes").select("id").limit(1);
      return !!r.error || r.data?.length === 0;
    });
    await check("anon cannot insert enquiries directly", async () => !!(await anon.from("wholesale_enquiries").insert({ enquiry_number: "X", idempotency_key: randomUUID(), customer_name: "x", email: "x@x.x", phone: "1", message: "x", consent_at: new Date().toISOString() })).error);
    await check("anon cannot call create_wholesale_enquiry RPC", async () => !!(await anon.rpc("create_wholesale_enquiry", { p: {} })).error);
    await check("anon cannot call hit_rate_limit RPC", async () => !!(await anon.rpc("hit_rate_limit", { p_key: "x", p_max: 1, p_window_seconds: 60 })).error);
    await check("anon cannot modify products", async () => {
      const r = await anon.from("products").update({ name: "hacked" }).eq("slug", draftSlug).select("id");
      return !!r.error || r.data?.length === 0;
    });
    await check("anon cannot download private attachments", async () => !!(await anon.storage.from("enquiry-attachments").download(attachmentPath)).error);
    await check("anon cannot list private attachments", async () => ((await anon.storage.from("enquiry-attachments").list(`enquiries/${enquiryId}`)).data?.length ?? 0) === 0);
    await check("anon cannot upload product media", async () => !!(await anon.storage.from("product-media").upload(`products/x/${randomUUID()}.jpg`, new Uint8Array([0xff, 0xd8, 0xff]), { contentType: "image/jpeg" })).error);
    await check("anon cannot read user_roles", async () => {
      const r = await anon.from("user_roles").select("user_id");
      return !!r.error || r.data?.length === 0;
    });

    // ---- sales staff ----------------------------------------------------------------
    await check("sales can read enquiries and notes", async () => (await sales.from("enquiry_notes").select("id").eq("enquiry_id", enquiryId)).data?.length === 1);
    await check("sales can update enquiry workflow fields", async () => !(await sales.from("wholesale_enquiries").update({ status: "under_review" }).eq("id", enquiryId)).error);
    await check("sales cannot change buyer-submitted data", async () => !!(await sales.from("wholesale_enquiries").update({ email: "changed@example.com" }).eq("id", enquiryId)).error);
    await check("sales can create a signed URL for an attachment", async () => !!(await sales.storage.from("enquiry-attachments").createSignedUrl(attachmentPath, 60)).data?.signedUrl);
    await check("sales cannot edit products", async () => {
      const r = await sales.from("products").update({ name: "sales edit" }).eq("slug", draftSlug).select("id");
      return !!r.error || r.data?.length === 0;
    });
    await check("sales cannot grant themselves admin", async () => !!(await sales.from("user_roles").insert({ user_id: salesUser.user!.id, role: "admin" })).error);
    await check("sales cannot write notes as someone else", async () => !!(await sales.from("enquiry_notes").insert({ enquiry_id: enquiryId, note: "spoof", author_id: randomUUID() })).error);
    await check("enquiry deletes are not possible for staff", async () => {
      await sales.from("wholesale_enquiries").delete().eq("id", enquiryId);
      return (await service.from("wholesale_enquiries").select("id").eq("id", enquiryId)).data?.length === 1;
    });

    // ---- administrators ----------------------------------------------------------------
    await check("admin can see unpublished products", async () => (await admin.from("products").select("id").eq("slug", draftSlug)).data?.length === 1);
    await check("admin can edit products", async () => ((await admin.from("products").update({ name: "Security draft (edited)" }).eq("slug", draftSlug).select("id")).data?.length ?? 0) === 1);
    await check("admin still cannot grant roles from the client", async () => !!(await admin.from("user_roles").insert({ user_id: salesUser.user!.id, role: "admin" })).error);
    await check("status changes are recorded with the staff user", async () => {
      const { data } = await service.from("enquiry_status_history").select("to_status, changed_by").eq("enquiry_id", enquiryId).order("changed_at");
      return data?.at(-1)?.to_status === "under_review" && data.at(-1)?.changed_by === salesUser.user!.id;
    });
  } finally {
    await service.storage.from("enquiry-attachments").remove([attachmentPath]);
    await service.from("wholesale_enquiries").delete().eq("id", enquiryId);
    if (draft) await service.from("products").delete().eq("id", draft.id);
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll security checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
