import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parseQuickAddFilename, type QuickAddDraft } from "@/lib/quick-add";

export const runtime = "nodejs";

function authed(request: Request) {
  return request.headers.get("cookie")?.includes("kk_admin_session=authenticated");
}

function fallbackDraft(fileName: string): QuickAddDraft {
  const parsed = parseQuickAddFilename(fileName);
  const title = parsed.productTitle || "New Custom Product";
  return {
    productTitle: title,
    shortDescription: `Handmade ${title.toLowerCase()} from K&K Kustom Kreations.`,
    description: `A handmade ${title.toLowerCase()} ready for gifting, events, or everyday use. Customize details in the admin before publishing.`,
    tags: parsed.tags ?? ["quick-add"],
    metaDescription: `Shop ${title} from K&K Kustom Kreations.`,
    imageAltText: `${title} handmade product photo`,
    suggestedCategory: parsed.suggestedCategory || "Custom Orders",
    suggestedAvailability: parsed.suggestedAvailability ?? "IN_STOCK",
    price: parsed.price || "",
    quantity: parsed.quantity ?? 0
  };
}

export async function POST(request: Request) {
  if (!authed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Upload a product image." }, { status: 400 });

  const draft = fallbackDraft(file.name);
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ draft, usedAi: false });

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this handmade product photo and filename "${file.name}". Return compact JSON only with productTitle, shortDescription, description, tags array, metaDescription, imageAltText, suggestedCategory, suggestedAvailability. Keep it boutique, accurate, and do not invent licensed brands.`
            },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${bytes.toString("base64")}`
            }
          ]
        }
      ]
    } as any);
    const text = response.output_text?.replace(/^```json\s*|\s*```$/g, "").trim();
    const ai = text ? JSON.parse(text) : {};
    return NextResponse.json({
      usedAi: true,
      draft: {
        ...draft,
        ...ai,
        tags: Array.isArray(ai.tags) ? ai.tags : draft.tags,
        price: draft.price,
        quantity: draft.quantity
      }
    });
  } catch (error) {
    return NextResponse.json({ draft, usedAi: false, warning: error instanceof Error ? error.message : "AI analysis failed; filename draft used." });
  }
}
