"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AdminState } from "@/app/admin/actions";

export function AdminForm({
  action,
  children,
  submitLabel = "Save"
}: {
  action: (state: AdminState, formData: FormData) => Promise<AdminState>;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="space-y-4 rounded-boutique border border-pink-100 bg-white p-5 shadow-soft">
      {children}
      <AdminSubmit label={submitLabel} />
      {state.message && (
        <p className={state.ok ? "rounded-xl bg-aqua-50 p-3 text-sm font-bold text-aqua-700" : "rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function AdminSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="focus-ring rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink disabled:opacity-60">
      {pending ? "Saving..." : label}
    </button>
  );
}
