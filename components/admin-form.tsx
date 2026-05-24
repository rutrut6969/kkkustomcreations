"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
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
  const formRef = useRef<HTMLFormElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok || !state.message) return;
    setToast(state.message.includes("Product saved") ? "Product updated successfully" : state.message);
    const details = formRef.current?.closest("details");
    if (details instanceof HTMLDetailsElement) details.open = false;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [state.ok, state.message]);

  return (
    <>
      <form ref={formRef} action={formAction} className="admin-form space-y-4 rounded-boutique border border-pink-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="grid min-w-0 gap-4">
          {children}
        </div>
        <div className="flex flex-col gap-3 border-t border-pink-50 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <AdminSubmit label={submitLabel} />
        </div>
        {state.message && !state.ok && (
          <p className="rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink">
            {state.message}
          </p>
        )}
      </form>
      {toast && (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-2xl border border-aqua-100 bg-white px-4 py-3 text-sm font-black text-aqua-700 shadow-pink">
          {toast}
        </div>
      )}
    </>
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
