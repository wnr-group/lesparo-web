"use client";

import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";

/**
 * A file input drawn as a button, with what was chosen shown beside it. The native input stays in the form (visually hidden,
 * inside the label so it keeps its keyboard focus and click behaviour) and clears itself when the form is reset.
 */
export function FilePicker({ id, name, accept, multiple = false, label = "Choose files" }: { id: string; name: string; accept?: string; multiple?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    const form = input.current?.form;
    const clear = () => setNames([]);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className={`${buttonClass("secondary", "md")} cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo`}>
        <Upload className="size-4" aria-hidden />
        {label}
        <input ref={input} id={id} name={name} type="file" multiple={multiple} accept={accept} className="sr-only" onChange={(e) => setNames([...(e.target.files ?? [])].map((f) => f.name))} />
      </label>
      <span className="min-w-0 truncate text-sm text-muted" aria-live="polite">
        {names.length === 0 ? "No file chosen" : names.length === 1 ? names[0] : `${names.length} files selected`}
      </span>
    </div>
  );
}
