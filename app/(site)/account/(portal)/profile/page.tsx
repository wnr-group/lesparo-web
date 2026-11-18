import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Loading from "../loading";
import { EmailForm, PasswordForm, ProfileForm } from "@/components/account/profile-forms";
import { requireCustomerPage } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Profile & security" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border border-line bg-plate p-5 sm:p-7">
      <h2 id={id} className="mb-5 font-display text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProfileContent />
    </Suspense>
  );
}

/** Reads the customer session, so it streams in behind the Suspense boundary above instead of blocking the navigation. */
async function ProfileContent() {
  const me = await requireCustomerPage("/account/profile");
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-3 font-display text-headline font-bold">Profile & security</h1>
      </header>
      <Section id="details" title="Your details">
        <ProfileForm name={me.name} phone={me.phone} />
      </Section>
      <Section id="email" title="Email address">
        <EmailForm email={me.email} />
      </Section>
      <Section id="password" title="Change password">
        <PasswordForm />
      </Section>
    </div>
  );
}
