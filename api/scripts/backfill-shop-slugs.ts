import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillShopSlugs() {
  const shops = await prisma.shop.findMany({
    where: { slug: null },
    select: { id: true, name: true, slug: true },
  })

  console.log(`Found ${shops.length} shops without slugs`)

  for (const shop of shops) {
    const baseSlug = shop.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'shop'

    let slug = baseSlug
    let attempt = 1

    while (attempt < 10) {
      const existing = await prisma.shop.findFirst({
        where: { slug, id: { not: shop.id } },
      })
      if (!existing) break
      slug = `${baseSlug}-${attempt + 1}`
      attempt++
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: { slug },
    })

    console.log(`Updated shop ${shop.id} (${shop.name}) -> ${slug}`)
  }

  console.log('Slug backfill complete')
}

backfillShopSlugs()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
