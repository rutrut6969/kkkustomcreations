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
    <form action={formAction} className="admin-form space-y-4 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft sm:p-5">
      <div className="grid min-w-0 gap-4">
        {children}
      </div>
      <div className="flex flex-col gap-3 border-t border-pink-50 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <AdminSubmit label={submitLabel} />
      </div>
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
    <button disabled={pending} className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 text-sm font-black text-white shadow-pink disabled:opacity-60 sm:w-auto">
      {pending ? "Saving..." : label}
    </button>
  );
}
