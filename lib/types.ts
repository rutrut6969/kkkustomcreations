export type CategoryView = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  availability: "IN_STOCK" | "LOW_STOCK" | "MADE_TO_ORDER" | "OUT_OF_STOCK";
  featured: boolean;
  category: CategoryView;
};

export type EventView = {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  description: string;
  facebookEventLink?: string | null;
  featured: boolean;
};

export type BlogPostView = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  publishedDate: Date;
  featuredImage?: string | null;
  status: "PUBLISHED" | "DRAFT";
};

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  active: boolean;
};

export type SocialProofView = {
  id: string;
  customerName: string;
  productName: string;
  productSlug?: string;
  fallbackUrl?: string | null;
  isSample: boolean;
};
