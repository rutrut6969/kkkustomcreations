"use client";

import Script from "next/script";
import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions";

export function ManagedForm({
  action,
  children,
  submitLabel
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const startedAt = useRef(Date.now());
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <form action={formAction} className="space-y-4 rounded-boutique border border-pink-100 bg-white p-5 shadow-pink">
      <input type="text" name="kk_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input type="hidden" name="kk_started_at" value={startedAt.current} />
      {children}
      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      )}
      <SubmitButton label={submitLabel} />
      {state.message && (
        <p className={state.ok ? "rounded-xl bg-aqua-50 p-3 text-sm font-bold text-aqua-700" : "rounded-xl bg-boutique-blush p-3 text-sm font-bold text-boutique-pink"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="focus-ring w-full rounded-full bg-boutique-pink px-5 py-3 font-black text-white shadow-pink disabled:opacity-60">
      {pending ? "Sending..." : label}
    </button>
  );
}
