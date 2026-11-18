"use client";

import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { defaultAddressAction, deleteAddressAction, saveAddressAction, type AccountState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Result, Submit, TextField } from "./bits";

export type AddressView = { id: string; label: string; fullName: string; phone: string; line: string; city: string; state: string; postcode: string; isDefault: boolean };

const idle: AccountState = {};

function AddressForm({ address, onDone }: { address?: AddressView; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: AccountState, fd: FormData) => {
    const next = await saveAddressAction(prev, fd);
    if (next.ok) onDone();
    return next;
  }, idle);
  return (
    <form action={action} className="space-y-5 border border-line bg-paper p-5 sm:p-6" noValidate>
      {address && <input type="hidden" name="addressId" value={address.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Address name" name="label" required defaultValue={address?.label ?? "Home"} hint="For example Home or Office." state={state} />
        <TextField label="Recipient name" name="fullName" autoComplete="name" required defaultValue={address?.fullName} state={state} />
        <TextField label="Mobile number" name="phone" type="tel" autoComplete="tel" required defaultValue={address?.phone} state={state} />
        <TextField label="PIN code" name="postcode" autoComplete="postal-code" required defaultValue={address?.postcode} state={state} />
      </div>
      <TextField label="Address" name="line" autoComplete="street-address" required defaultValue={address?.line} state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="City" name="city" autoComplete="address-level2" required defaultValue={address?.city} state={state} />
        <TextField label="State" name="state" autoComplete="address-level1" required defaultValue={address?.state} state={state} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="size-4 accent-indigo" />
        Use as my default delivery address
      </label>
      <Result state={state} />
      <div className="flex gap-3">
        <Submit>{address ? "Save address" : "Add address"}</Submit>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressCard({ address, onEdit }: { address: AddressView; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<AccountState>) =>
    start(async () => {
      const r = await fn();
      setError(r.ok ? undefined : r.message);
    });
  return (
    <div className="flex h-full flex-col justify-between border border-line bg-plate p-5">
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-indigo" aria-hidden />
          <p className="font-semibold">{address.label}</p>
          {address.isDefault && <Badge tone="indigo">Default</Badge>}
        </div>
        <address className="mt-3 text-sm not-italic leading-relaxed text-ink-soft">
          {address.fullName}
          <br />
          {address.line}
          <br />
          {address.city}, {address.state} {address.postcode}
          <br />
          {address.phone}
        </address>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onEdit} disabled={pending}>
          <Pencil className="size-3.5" aria-hidden /> Edit
        </Button>
        {!address.isDefault && (
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(() => defaultAddressAction(address.id))}>
            <Star className="size-3.5" aria-hidden /> Make default
          </Button>
        )}
        <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => confirm("Remove this address?") && run(() => deleteAddressAction(address.id))}>
          <Trash2 className="size-3.5" aria-hidden /> Remove
        </Button>
      </div>
    </div>
  );
}

export function AddressManager({ addresses, max }: { addresses: AddressView[]; max: number }) {
  // "new", an address id being edited, or null.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const close = () => setEditing(null);
  return (
    <div className="space-y-6">
      {editing === "new" && <AddressForm onDone={close} />}
      {addresses.length === 0 && editing !== "new" && <p className="text-ink-soft">You have not saved an address yet.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={editing === a.id ? "md:col-span-2" : undefined}>
            {editing === a.id ? <AddressForm address={a} onDone={close} /> : <AddressCard address={a} onEdit={() => setEditing(a.id)} />}
          </li>
        ))}
      </ul>
      {editing === null && (
        <Button type="button" onClick={() => setEditing("new")} disabled={addresses.length >= max}>
          <Plus className="size-4" aria-hidden /> Add an address
        </Button>
      )}
    </div>
  );
}
