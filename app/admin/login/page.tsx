import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

// Fixed messages only: the notice code from the address bar is looked up, never printed.
const NOTICES: Record<string, string> = {
  signedout: "You have been signed out.",
  reset: "Your password was changed. Sign in with the new one.",
  expired: "That reset link has expired or was already used. Request a new one.",
};

/** Reads the query string at request time, so it streams in behind a boundary while the form itself stays in the static page. */
async function Notice({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const code = (await searchParams).notice;
  const text = typeof code === "string" ? NOTICES[code] : undefined;
  if (!text) return null;
  return <p className="mt-6 border border-line bg-plate px-3 py-2 text-center text-sm text-ink-soft">{text}</p>;
}

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Image src="/lesparo-logo-v3.png" alt="LESPARO" width={875} height={460} className="mx-auto h-16 w-auto" priority />
        <h1 className="mt-8 text-center font-display font-semibold text-3xl">Staff sign in</h1>
        <Suspense fallback={null}>
          <Notice searchParams={props.searchParams} />
        </Suspense>
        <LoginForm />
        <p className="mt-4 text-center text-xs text-muted">Accounts are created by an administrator.</p>
      </div>
    </main>
  );
}
