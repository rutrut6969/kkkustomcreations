export type FulfillmentChoice = "SHIPPING" | "PICKUP" | "DROPOFF";

export type ShippingSettings = {
  shippingEnabled: boolean;
  localPickupEnabled: boolean;
  localDropoffEnabled: boolean;
  flatShippingRateCents: number;
  freeShippingThresholdCents: number;
  localDropoffFeeCents: number;
  shippingCheckoutMessage: string;
};

export type CheckoutTotals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  freeShippingApplied: boolean;
};

export const defaultShippingSettings: ShippingSettings = {
  shippingEnabled: true,
  localPickupEnabled: true,
  localDropoffEnabled: false,
  flatShippingRateCents: 600,
  freeShippingThresholdCents: 0,
  localDropoffFeeCents: 0,
  shippingCheckoutMessage: "Orders are typically shipped within 2-5 business days."
};

function centsFromSetting(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[$,]/g, "");
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100);
}

function booleanFromSetting(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "on";
}

export function parseShippingSettings(settings: Record<string, string>): ShippingSettings {
  const configuredFlatRate = settings.flatShippingRate === undefined ? defaultShippingSettings.flatShippingRateCents : centsFromSetting(settings.flatShippingRate);
  return {
    shippingEnabled: booleanFromSetting(settings.shippingEnabled, defaultShippingSettings.shippingEnabled),
    localPickupEnabled: booleanFromSetting(settings.localPickupEnabled, defaultShippingSettings.localPickupEnabled),
    localDropoffEnabled: booleanFromSetting(settings.localDropoffEnabled, defaultShippingSettings.localDropoffEnabled),
    flatShippingRateCents: configuredFlatRate,
    freeShippingThresholdCents: centsFromSetting(settings.freeShippingThreshold),
    localDropoffFeeCents: centsFromSetting(settings.localDropoffFee),
    shippingCheckoutMessage: settings.shippingCheckoutMessage?.trim() || defaultShippingSettings.shippingCheckoutMessage
  };
}

export function calculateCheckoutTotals(
  subtotalCents: number,
  fulfillmentType: FulfillmentChoice,
  settings: ShippingSettings
): CheckoutTotals {
  const safeSubtotal = Math.max(0, Math.round(subtotalCents));
  const freeShippingApplied =
    fulfillmentType === "SHIPPING" &&
    settings.freeShippingThresholdCents > 0 &&
    safeSubtotal >= settings.freeShippingThresholdCents;
  const shippingCents =
    fulfillmentType === "SHIPPING"
      ? freeShippingApplied
        ? 0
        : settings.flatShippingRateCents
      : fulfillmentType === "DROPOFF"
        ? settings.localDropoffFeeCents
        : 0;
  const taxCents = 0;
  return {
    subtotalCents: safeSubtotal,
    shippingCents,
    taxCents,
    totalCents: safeSubtotal + shippingCents + taxCents,
    freeShippingApplied
  };
}

export function fulfillmentEnabled(fulfillmentType: FulfillmentChoice, settings: ShippingSettings) {
  if (fulfillmentType === "SHIPPING") return settings.shippingEnabled;
  if (fulfillmentType === "PICKUP") return settings.localPickupEnabled;
  return settings.localDropoffEnabled;
}
