import type { AnnouncementView, BlogPostView, CategoryView, EventView, ProductView, SocialProofView } from "@/lib/types";

export const sampleCategories: CategoryView[] = [
  { id: "cat-tumblers", name: "Tumblers", slug: "tumblers", description: "Custom cups and glitter tumblers." },
  { id: "cat-pens", name: "Pens", slug: "pens", description: "Beaded, glitter, and themed pens." },
  { id: "cat-keychains", name: "Keychains", slug: "keychains", description: "Cute everyday keychains." },
  { id: "cat-badge-reels", name: "Badge Reels", slug: "badge-reels", description: "Work-ready badge reels with personality." },
  { id: "cat-wristlets", name: "Wristlets", slug: "wristlets", description: "Handmade wristlets and accessories." },
  { id: "cat-seasonal", name: "Seasonal", slug: "seasonal", description: "Holiday and limited-run creations." },
  { id: "cat-custom", name: "Custom Orders", slug: "custom-orders", description: "Made-for-you custom pieces." }
];

const category = (slug: string) => sampleCategories.find((item) => item.slug === slug) ?? sampleCategories[0];

export const sampleProducts: ProductView[] = [
  {
    id: "prod-custom-tumbler",
    name: "Custom Glitter Tumbler",
    slug: "custom-glitter-tumbler",
    description: "A bright, handmade tumbler personalized with colors, name, theme, and sparkle level.",
    priceCents: 3200,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80",
    stock: 8,
    availability: "MADE_TO_ORDER",
    featured: true,
    category: category("tumblers")
  },
  {
    id: "prod-floral-pen",
    name: "Floral Beaded Pen",
    slug: "floral-beaded-pen",
    description: "Smooth-writing handmade pen with cheerful beads and boutique floral details.",
    priceCents: 900,
    imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=80",
    stock: 14,
    availability: "IN_STOCK",
    featured: true,
    category: category("pens")
  },
  {
    id: "prod-badge-reel",
    name: "Nurse Badge Reel",
    slug: "nurse-badge-reel",
    description: "Lightweight badge reel with a wipeable topper and sweet handmade finish.",
    priceCents: 1200,
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80",
    stock: 6,
    availability: "LOW_STOCK",
    featured: true,
    category: category("badge-reels")
  },
  {
    id: "prod-wristlet",
    name: "Aqua Pink Wristlet",
    slug: "aqua-pink-wristlet",
    description: "A soft wristlet for keys, bags, and everyday grab-and-go sparkle.",
    priceCents: 1400,
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    stock: 10,
    availability: "IN_STOCK",
    featured: false,
    category: category("wristlets")
  },
  {
    id: "prod-seasonal-keychain",
    name: "Seasonal Acrylic Keychain",
    slug: "seasonal-acrylic-keychain",
    description: "A rotating seasonal keychain design, perfect for gifts and event finds.",
    priceCents: 800,
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
    stock: 0,
    availability: "OUT_OF_STOCK",
    featured: false,
    category: category("seasonal")
  },
  {
    id: "prod-custom-request",
    name: "Custom Creative Request",
    slug: "custom-creative-request",
    description: "Start a custom piece with your theme, colors, timeline, and inspiration notes.",
    priceCents: 500,
    imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=900&q=80",
    stock: 99,
    availability: "MADE_TO_ORDER",
    featured: false,
    category: category("custom-orders")
  }
];

export const sampleEvents: EventView[] = [
  {
    id: "event-spring-market",
    title: "Spring Handmade Vendor Market",
    date: new Date("2026-06-06T12:00:00"),
    time: "10:00 AM - 3:00 PM",
    location: "Local Vendor Mall",
    description: "Shop fresh tumblers, badge reels, wristlets, and seasonal gift ideas in person.",
    facebookEventLink: "https://facebook.com",
    featured: true
  },
  {
    id: "event-pop-up",
    title: "Weekend Pop-Up Table",
    date: new Date("2026-06-20T12:00:00"),
    time: "11:00 AM - 4:00 PM",
    location: "Community Craft Hall",
    description: "Come browse ready-to-gift items and chat about custom orders.",
    facebookEventLink: null,
    featured: false
  }
];

export const samplePosts: BlogPostView[] = [
  {
    id: "post-custom-orders-open",
    title: "Custom Orders Are Open",
    slug: "custom-orders-are-open",
    excerpt: "A quick update on timelines, inspiration photos, and how custom requests work.",
    body: "Custom order spots are open for tumblers, badge reels, wristlets, pens, and seasonal gifts. Send your theme, colors, timeline, and any inspiration notes so we can plan your piece.",
    publishedDate: new Date("2026-05-15T12:00:00"),
    featuredImage: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=80",
    status: "PUBLISHED"
  },
  {
    id: "post-market-restock",
    title: "Market Restock Preview",
    slug: "market-restock-preview",
    excerpt: "A peek at the bright boutique pieces heading to the next vendor event.",
    body: "We are bringing fresh badge reels, glitter pens, keychains, and a small run of seasonal accessories to the next event. Quantities are limited, so stop by early.",
    publishedDate: new Date("2026-05-18T12:00:00"),
    featuredImage: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=80",
    status: "PUBLISHED"
  }
];

export const sampleAnnouncements: AnnouncementView[] = [
  {
    id: "announcement-1",
    title: "Custom spots open",
    body: "Custom order spots are open this week. Send your theme, colors, and needed-by date.",
    active: true
  }
];

export const sampleSettings: Record<string, string> = {
  businessName: "K&K Kustom Kreations",
  homepageBannerText: "Handmade gifts, custom sparkle, and vendor-market favorites.",
  businessInfo: "K&K Kustom Kreations creates handmade cups, tumblers, pens, keychains, badge reels, wristlets, seasonal items, and custom creative products.",
  contactEmail: "hello@kkkustomkreations.com",
  contactPhone: "(555) 123-4567",
  facebookUrl: "https://facebook.com",
  facebookEmbedUrl: "",
  shippingText: "Shipping is available for eligible products. Final timing depends on item type and custom details.",
  pickupText: "Local pickup is available after your order is confirmed.",
  dropoffText: "Local dropoff may be available in nearby areas by arrangement.",
  customOrdersEnabled: "true"
};

export const sampleSocialProof: SocialProofView[] = [
  { id: "proof-1", customerName: "Jose", productName: "Custom Glitter Tumbler", productSlug: "custom-glitter-tumbler", isSample: true },
  { id: "proof-2", customerName: "Amanda", productName: "Floral Beaded Pen", productSlug: "floral-beaded-pen", isSample: true },
  { id: "proof-3", customerName: "Taylor", productName: "Nurse Badge Reel", productSlug: "nurse-badge-reel", isSample: true },
  { id: "proof-4", customerName: "Morgan", productName: "Aqua Pink Wristlet", productSlug: "aqua-pink-wristlet", isSample: true },
  { id: "proof-5", customerName: "Riley", productName: "Seasonal Acrylic Keychain", fallbackUrl: "/shop?category=seasonal", isSample: true }
];
