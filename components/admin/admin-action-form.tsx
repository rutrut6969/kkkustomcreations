"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AdminState } from "@/app/admin/actions";

export function AdminActionForm({
  action,
  children,
  label,
  tone = "pink"
}: {
  action: (state: AdminState, formData: FormData) => Promise<AdminState>;
  children?: React.ReactNode;
  label: string;
  tone?: "pink" | "aqua" | "neutral";
}) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="grid gap-2">
      {children}
      <ActionSubmit label={label} tone={tone} />
      {state.message && (
        <p className={state.ok ? "rounded-xl bg-aqua-50 p-2 text-xs font-bold text-aqua-700" : "rounded-xl bg-boutique-blush p-2 text-xs font-bold text-boutique-pink"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function ActionSubmit({ label, tone }: { label: string; tone: "pink" | "aqua" | "neutral" }) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "aqua"
      ? "border-aqua-200 bg-aqua-50 text-boutique-charcoal hover:bg-aqua-100"
      : tone === "neutral"
        ? "border-zinc-200 bg-white text-boutique-charcoal hover:bg-zinc-50"
        : "border-boutique-pink bg-boutique-pink text-white shadow-pink hover:bg-pink-500";
  return (
    <button disabled={pending} className={`focus-ring rounded-full border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}>
      {pending ? "Working..." : label}
    </button>
  );
}
