"use client";

import { useState, useTransition } from "react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export function AdminPushManager({ publicKey }: { publicKey?: string }) {
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  async function enablePush() {
    if (!supported) {
      setMessage("This browser does not support push notifications.");
      return;
    }
    if (!publicKey) {
      setMessage("Add NEXT_PUBLIC_ADMIN_VAPID_PUBLIC_KEY before enabling browser push.");
      return;
    }

    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage("Notification permission was not granted.");
          return;
        }
        const registration = await navigator.serviceWorker.register("/admin-push-sw.js");
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          }));
        const response = await fetch("/api/admin/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription)
        });
        setMessage(response.ok ? "This device is subscribed for admin alerts." : "Could not save this push subscription.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not enable push notifications.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-aqua-100 bg-aqua-50/60 p-3">
      <p className="font-black">Browser push alerts</p>
      <p className="mt-1 text-sm leading-6 text-boutique-charcoal/65">
        Subscribe approved admin devices for future order, payment, and sync-failure alerts.
      </p>
      <button
        type="button"
        onClick={enablePush}
        disabled={pending}
        className="focus-ring mt-3 w-full rounded-full bg-boutique-pink px-4 py-2 text-sm font-black text-white shadow-pink disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Enabling..." : "Enable on this device"}
      </button>
      {message && <p className="mt-2 text-sm font-bold text-boutique-charcoal/65">{message}</p>}
    </div>
  );
}
