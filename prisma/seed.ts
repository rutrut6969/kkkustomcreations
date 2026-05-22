import { PrismaClient } from "@prisma/client";
import { sampleAnnouncements, sampleCategories, sampleEvents, samplePosts, sampleProducts, sampleSettings, sampleSocialProof } from "../lib/sample-data";

const prisma = new PrismaClient();

async function main() {
  for (const category of sampleCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: { name: category.name, slug: category.slug, description: category.description }
    });
  }

  for (const product of sampleProducts) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: product.category.slug } });
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
        availability: product.availability,
        featured: product.featured,
        categoryId: category.id
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
        availability: product.availability,
        featured: product.featured,
        categoryId: category.id
      }
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
