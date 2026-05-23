import { PrismaClient } from "@prisma/client";
import { sampleAnnouncements, sampleCategories, sampleEvents, samplePosts, sampleProducts, sampleSettings, sampleSocialProof } from "../lib/sample-data";

const prisma = new PrismaClient();

async function main() {
  for (const category of sampleCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: { name: category.name, slug: category.slug, description: category.description, visible: true }
    });
  }

  for (const product of sampleProducts) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: product.category.slug } });
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        shortDescription: product.description.slice(0, 140),
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
        availability: product.availability,
        madeToOrder: product.availability === "MADE_TO_ORDER",
        tags: [product.category.slug, product.featured ? "featured" : "boutique"].filter(Boolean),
        featured: product.featured,
        categoryId: category.id
      },
      create: {
        name: product.name,
        slug: product.slug,
        shortDescription: product.description.slice(0, 140),
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
        availability: product.availability,
        madeToOrder: product.availability === "MADE_TO_ORDER",
        tags: [product.category.slug, product.featured ? "featured" : "boutique"].filter(Boolean),
        featured: product.featured,
        categoryId: category.id
      }
    });
    const savedProduct = await prisma.product.findUniqueOrThrow({ where: { slug: product.slug } });
    await prisma.productImage.upsert({
      where: { id: `${savedProduct.id}-primary` },
      update: { url: product.imageUrl, alt: product.name },
      create: { id: `${savedProduct.id}-primary`, productId: savedProduct.id, url: product.imageUrl, alt: product.name }
    });
  }

  for (const [key, value] of Object.entries(sampleSettings)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  for (const announcement of sampleAnnouncements) {
    await prisma.announcement.upsert({
      where: { id: announcement.id },
      update: { title: announcement.title, body: announcement.body, active: announcement.active },
      create: { id: announcement.id, title: announcement.title, body: announcement.body, active: announcement.active }
    });
  }

  for (const event of sampleEvents) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        facebookEventLink: event.facebookEventLink,
        featured: event.featured
      },
      create: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        facebookEventLink: event.facebookEventLink,
        featured: event.featured
      }
    });
  }

  for (const post of samplePosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        publishedDate: post.publishedDate,
        featuredImage: post.featuredImage,
        status: post.status
      },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        publishedDate: post.publishedDate,
        featuredImage: post.featuredImage,
        status: post.status
      }
    });
  }

  for (const proof of sampleSocialProof) {
    const product = proof.productSlug ? await prisma.product.findUnique({ where: { slug: proof.productSlug } }) : null;
    await prisma.socialProofPurchase.upsert({
      where: { id: proof.id },
      update: {
        customerName: proof.customerName,
        productName: proof.productName,
        productId: product?.id,
        fallbackUrl: proof.fallbackUrl,
        isSample: true
      },
      create: {
        id: proof.id,
        customerName: proof.customerName,
        productName: proof.productName,
        productId: product?.id,
        fallbackUrl: proof.fallbackUrl,
        isSample: true
      }
    });
  }

  const customer = await prisma.customer.upsert({
    where: { id: "demo-customer-1" },
    update: { name: "Demo Customer", email: "demo@example.com", phone: "555-0101" },
    create: { id: "demo-customer-1", name: "Demo Customer", email: "demo@example.com", phone: "555-0101", city: "Orlando", state: "FL" }
  });
  const tumbler = await prisma.product.findUnique({ where: { slug: "custom-glitter-tumbler" } });
  await prisma.order.upsert({
    where: { orderNumber: "KK-1001" },
    update: { customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, totalCents: 3200, subtotalCents: 3200 },
    create: {
      orderNumber: "KK-1001",
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      fulfillmentType: "PICKUP",
      paymentStatus: "PAID",
      status: "PROCESSING",
      subtotalCents: 3200,
      totalCents: 3200,
      notes: "Demo order for admin preview.",
      items: {
        create: {
          productId: tumbler?.id,
          productName: "Custom Glitter Tumbler",
          quantity: 1,
          unitPriceCents: 3200,
          totalCents: 3200,
          customizationNotes: "Aqua and pink sparkle"
        }
      }
    }
  });

  for (const product of sampleProducts.slice(0, 4)) {
    await prisma.mediaAsset.upsert({
      where: { id: `media-${product.id}` },
      update: { fileName: product.name, url: product.imageUrl, altText: product.name, assetType: "IMAGE", mimeType: "image/jpeg" },
      create: { id: `media-${product.id}`, fileName: product.name, url: product.imageUrl, altText: product.name, assetType: "IMAGE", mimeType: "image/jpeg" }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
