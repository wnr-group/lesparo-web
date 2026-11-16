import type { Metadata } from "next";
import { AddressManager } from "@/components/account/address-manager";
import { requireCustomerPage } from "@/lib/auth/customer";
import { listAddresses } from "@/lib/services/customer-account";
import { MAX_ADDRESSES } from "@/lib/validation/customer";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const me = await requireCustomerPage("/account/addresses");
  const rows = await listAddresses(me.id);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-3 font-display text-headline font-bold">Delivery addresses</h1>
        <p className="mt-2 text-ink-soft">Saved addresses fill in checkout for you.</p>
      </header>
      <AddressManager
        max={MAX_ADDRESSES}
        addresses={rows.map((a) => ({ id: a.id, label: a.label, fullName: a.full_name, phone: a.phone, line: a.line, city: a.city, state: a.state, postcode: a.postcode, isDefault: a.is_default }))}
      />
    </div>
  );
}
