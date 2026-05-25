import "server-only";

import { z } from "zod";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import { calculateCheckoutTotals, fulfillmentEnabled, parseShippingSettings, type CheckoutTotals } from "@/lib/shipping";

const checkoutBaseSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    name: z.string().trim().min(1),
    priceCents: z.number().int().positive(),
    quantity: z.number().int().positive().max(99)
  })).min(1),
  fulfillmentType: z.enum(["SHIPPING", "PICKUP", "DROPOFF"]),
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^\d{10}$/, "A valid 10-digit phone number is required."),
  address1: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  consent: z.literal(true),
  marketingConsent: z.boolean().optional()
});

function validateCheckoutFields(value: z.infer<typeof checkoutBaseSchema>, ctx: z.RefinementCtx) {
  const fakeNames = new Set(["test", "asdf", "unknown", "customer", "square customer", "n/a", "na"]);
  if (fakeNames.has(value.name.toLowerCase())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Please enter a valid customer name." });
  }
  if (["SHIPPING", "DROPOFF"].includes(value.fulfillmentType)) {
    if (!value.address1 || value.address1.length < 4) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address1"], message: "Street address is required." });
    if (!value.city || value.city.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: "City is required." });
    if (!value.state || value.state.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state"], message: "State is required." });
    if (!value.postalCode || !/^\d{5}(-\d{4})?$/.test(value.postalCode)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["postalCode"], message: "Valid ZIP code is required." });
  }
}

const checkoutSchema = checkoutBaseSchema.superRefine(validateCheckoutFields);

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export function parseCheckoutPayload(input: unknown) {
  return checkoutSchema.safeParse(input);
}

const directPaymentSchema = checkoutBaseSchema.extend({
  sourceId: z.string().min(1),
  verificationToken: z.string().optional(),
  checkoutSessionId: z.string().min(8).max(120).optional(),
  paymentMethod: z.enum(["card", "afterpay_clearpay"]).default("card")
}).superRefine(validateCheckoutFields);

export type DirectPaymentPayload = z.infer<typeof directPaymentSchema>;

export function parseDirectPaymentPayload(input: unknown) {
  return directPaymentSchema.safeParse(input);
}

export async function calculateServerCheckoutTotals(payload: CheckoutPayload) {
  const settings = parseShippingSettings(await getSettings());
  if (!fulfillmentEnabled(payload.fulfillmentType, settings)) {
    throw new Error("The selected fulfillment method is not currently available.");
  }
  const subtotalCents = payload.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  return calculateCheckoutTotals(subtotalCents, payload.fulfillmentType, settings);
}

export function squareConfig() {
  const env = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const prefix = env === "production" ? "SQUARE_PRODUCTION" : "SQUARE_SANDBOX";
  const accessToken = process.env[`${prefix}_ACCESS_TOKEN`];
  const applicationId = process.env[`${prefix}_APPLICATION_ID`];
  const locationId = process.env[`${prefix}_LOCATION_ID`];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = env === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  const missing = [
    !accessToken && `${prefix}_ACCESS_TOKEN`,
    !applicationId && `${prefix}_APPLICATION_ID`,
    !siteUrl && "NEXT_PUBLIC_SITE_URL"
  ].filter(Boolean) as string[];
  return { env, accessToken, applicationId, locationId, siteUrl, baseUrl, missing };
}

export async function resolveLocationId(config: ReturnType<typeof squareConfig>) {
  if (config.locationId) return config.locationId;
  if (!config.accessToken) return null;

  const response = await fetch(`${config.baseUrl}/v2/locations`, {
    headers: {
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${config.accessToken}`
    }
  });
  const result = await response.json();
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map((error: { detail?: string }) => error.detail).join(" ") : "Unable to fetch Square locations.";
    throw new Error(message || "Unable to fetch Square locations.");
  }
  const location = result.locations?.find((item: { status?: string }) => item.status === "ACTIVE") ?? result.locations?.[0];
  return location?.id as string | undefined;
}

export async function squareWebSdkConfig() {
  const config = squareConfig();
  const missing = [
    !config.accessToken && `SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_ACCESS_TOKEN`,
    !config.applicationId && `SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_APPLICATION_ID`
  ].filter(Boolean) as string[];
  if (missing.length) {
    throw new Error(`Missing Square configuration: ${missing.join(", ")}`);
  }
  const locationId = await resolveLocationId(config);
  if (!locationId) {
    throw new Error(`Missing Square configuration: SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_LOCATION_ID`);
  }
  return {
    environment: config.env,
    applicationId: config.applicationId,
    locationId,
    sdkUrl: config.env === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js"
  };
}

export async function createSquarePayment(payload: DirectPaymentPayload) {
  const config = squareConfig();
  const missing = [
    !config.accessToken && `SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_ACCESS_TOKEN`
  ].filter(Boolean) as string[];
  if (missing.length) {
    throw new Error(`Missing Square configuration: ${missing.join(", ")}`);
  }
  const locationId = await resolveLocationId(config);
  if (!locationId) {
    throw new Error(`Missing Square configuration: SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_LOCATION_ID`);
  }

  const totals = await calculateServerCheckoutTotals(payload);
  const address = [payload.address1, payload.city, payload.state, payload.postalCode].filter(Boolean).join(", ");
  const orderId = await createSquareOrderForDirectPayment(payload, locationId, totals);
  const response = await fetch(`${config.baseUrl}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${config.accessToken}`
    },
    body: JSON.stringify({
      source_id: payload.sourceId,
      idempotency_key: payload.checkoutSessionId ?? crypto.randomUUID(),
      verification_token: payload.verificationToken || undefined,
      amount_money: {
        amount: totals.totalCents,
        currency: "USD"
      },
      location_id: locationId,
      order_id: orderId,
      autocomplete: true,
      buyer_email_address: payload.email,
      note: [
        `K&K website checkout`,
        `Fulfillment: ${payload.fulfillmentType}`,
        `Customer: ${payload.name}`,
        `Phone: ${payload.phone}`,
        address && `Address: ${address}`,
        `Shipping/fee: ${(totals.shippingCents / 100).toFixed(2)}`,
        `Tax: ${(totals.taxCents / 100).toFixed(2)}`,
        payload.notes && `Notes: ${payload.notes}`,
        `Payment method: ${payload.paymentMethod}`,
        `Required consent: yes`,
        `Marketing consent: ${payload.marketingConsent ? "yes" : "no"}`
      ].filter(Boolean).join("\n"),
      metadata: {
        source: "kk_website",
        fulfillmentType: payload.fulfillmentType,
        consent: "true",
        marketingConsent: payload.marketingConsent ? "true" : "false"
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map((error: { detail?: string }) => error.detail).join(" ") : "Square payment failed.";
    throw new Error(message || "Square payment failed.");
  }
  return result.payment as { id: string; order_id?: string; status?: string };
}

async function createSquareOrderForDirectPayment(payload: DirectPaymentPayload, locationId: string, totals: CheckoutTotals) {
  const config = squareConfig();
  const productIds = payload.items.map((item) => item.productId);
  const products = hasDatabaseUrl()
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true }
      })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const address = [payload.address1, payload.city, payload.state, payload.postalCode].filter(Boolean).join(", ");

  const response = await fetch(`${config.baseUrl}/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${config.accessToken}`
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: locationId,
        reference_id: `kk-direct-${Date.now()}`,
        customer_email: payload.email,
        line_items: payload.items.map((item) => {
          const product = productMap.get(item.productId);
          const variation = product?.variants.find((variant) => variant.squareCatalogId);
          return {
            name: item.name,
            quantity: String(item.quantity),
            catalog_object_id: variation?.squareCatalogId ?? undefined,
            base_price_money: {
              amount: item.priceCents,
              currency: "USD"
            },
            note: payload.notes || undefined
          };
        }),
        service_charges: totals.shippingCents > 0
          ? [
              {
                name: payload.fulfillmentType === "DROPOFF" ? "Local dropoff fee" : "Shipping",
                amount_money: {
                  amount: totals.shippingCents,
                  currency: "USD"
                },
                calculation_phase: "TOTAL_PHASE",
                taxable: false
              }
            ]
          : undefined,
        fulfillments: [
          {
            type: payload.fulfillmentType === "SHIPPING" ? "SHIPMENT" : "PICKUP",
            state: "PROPOSED",
            [payload.fulfillmentType === "SHIPPING" ? "shipment_details" : "pickup_details"]:
              payload.fulfillmentType === "SHIPPING"
                ? {
                    recipient: {
                      display_name: payload.name,
                      email_address: payload.email,
                      phone_number: payload.phone,
                      address: {
                        address_line_1: payload.address1,
                        locality: payload.city,
                        administrative_district_level_1: payload.state,
                        postal_code: payload.postalCode,
                        country: "US"
                      }
                    }
                  }
                : {
                    recipient: {
                      display_name: payload.name,
                      email_address: payload.email,
                      phone_number: payload.phone
                    },
                    schedule_type: "ASAP",
                    note: payload.fulfillmentType === "DROPOFF" ? `Local dropoff requested. ${address}` : "Local pickup requested."
                  }
          }
        ],
        metadata: {
          source: "kk_website_direct_checkout",
          fulfillmentType: payload.fulfillmentType,
          consent: "true",
          marketingConsent: payload.marketingConsent ? "true" : "false"
        }
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map((error: { detail?: string }) => error.detail).join(" ") : "Square order creation failed.";
    throw new Error(message || "Square order creation failed.");
  }
  const id = result.order?.id;
  if (!id) throw new Error("Square did not return an order id.");
  return id as string;
}

export async function createSquarePaymentLink(payload: CheckoutPayload) {
  const config = squareConfig();
  if (config.missing.length) {
    throw new Error(`Missing Square configuration: ${config.missing.join(", ")}`);
  }
  const locationId = await resolveLocationId(config);
  if (!locationId) {
    throw new Error(`Missing Square configuration: SQUARE_${config.env === "production" ? "PRODUCTION" : "SANDBOX"}_LOCATION_ID`);
  }

  const address = [payload.address1, payload.city, payload.state, payload.postalCode].filter(Boolean).join(", ");
  const totals = await calculateServerCheckoutTotals(payload);
  const noteLines = [
    `Fulfillment: ${payload.fulfillmentType}`,
    `Customer: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    address && `Address: ${address}`,
    `Shipping/fee: ${(totals.shippingCents / 100).toFixed(2)}`,
    `Tax: ${(totals.taxCents / 100).toFixed(2)}`,
    payload.notes && `Notes: ${payload.notes}`,
    `Required consent: yes`,
    `Marketing consent: ${payload.marketingConsent ? "yes" : "no"}`
  ].filter(Boolean);

  const body = {
    idempotency_key: crypto.randomUUID(),
    quick_pay: undefined,
    checkout_options: {
      redirect_url: `${config.siteUrl}/checkout/success`,
      ask_for_shipping_address: payload.fulfillmentType === "SHIPPING"
    },
    order: {
      location_id: locationId,
      reference_id: `kk-${Date.now()}`,
      customer_email: payload.email,
      line_items: payload.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        base_price_money: {
          amount: item.priceCents,
          currency: "USD"
        },
        note: payload.notes || undefined
      })),
      service_charges: totals.shippingCents > 0
        ? [
            {
              name: payload.fulfillmentType === "DROPOFF" ? "Local dropoff fee" : "Shipping",
              amount_money: {
                amount: totals.shippingCents,
                currency: "USD"
              },
              calculation_phase: "TOTAL_PHASE",
              taxable: false
            }
          ]
        : undefined,
      fulfillments: [
        {
          type: payload.fulfillmentType === "SHIPPING" ? "SHIPMENT" : "PICKUP",
          state: "PROPOSED",
          [payload.fulfillmentType === "SHIPPING" ? "shipment_details" : "pickup_details"]:
            payload.fulfillmentType === "SHIPPING"
              ? {
                  recipient: {
                    display_name: payload.name,
                    email_address: payload.email,
                    phone_number: payload.phone,
                    address: {
                      address_line_1: payload.address1,
                      locality: payload.city,
                      administrative_district_level_1: payload.state,
                      postal_code: payload.postalCode,
                      country: "US"
                    }
                  }
                }
              : {
                  recipient: {
                    display_name: payload.name,
                    email_address: payload.email,
                    phone_number: payload.phone
                  },
                  schedule_type: "ASAP",
                  note: payload.fulfillmentType === "DROPOFF" ? `Local dropoff requested. ${address}` : "Local pickup requested."
                }
        }
      ],
      metadata: {
        fulfillmentType: payload.fulfillmentType,
        consent: "true",
        marketingConsent: payload.marketingConsent ? "true" : "false"
      },
      note: noteLines.join("\n")
    }
  };

  const response = await fetch(`${config.baseUrl}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${config.accessToken}`
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (!response.ok) {
    const message = Array.isArray(result.errors) ? result.errors.map((error: { detail?: string }) => error.detail).join(" ") : "Square checkout failed.";
    throw new Error(message || "Square checkout failed.");
  }

  const url = result.payment_link?.url;
  if (!url) throw new Error("Square did not return a checkout URL.");
  return url as string;
}
