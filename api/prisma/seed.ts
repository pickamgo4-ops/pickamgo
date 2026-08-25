import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@pickamgo.gh' },
    update: {},
    create: {
      email: 'demo@pickamgo.gh',
      phone: '+233501234567',
      passwordHash: hashedPassword,
      name: 'Ama Mensah',
      location: 'Legon, Accra',
      isSeller: true,
      emailVerified: true,
    },
  })

  const riderUser = await prisma.user.upsert({
    where: { email: 'rider@pickamgo.gh' },
    update: {},
    create: {
      email: 'rider@pickamgo.gh',
      phone: '+233509876543',
      passwordHash: hashedPassword,
      name: 'Kofi Asante',
      location: 'Legon, Accra',
      isRider: true,
      emailVerified: true,
    },
  })

  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'Regular customer' },
  })

  await prisma.role.upsert({
    where: { name: 'SELLER' },
    update: {},
    create: { name: 'SELLER', description: 'Seller/Shop owner' },
  })

  await prisma.role.upsert({
    where: { name: 'RIDER' },
    update: {},
    create: { name: 'RIDER', description: 'Delivery rider' },
  })

  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Platform administrator' },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pickamgo.gh' },
    update: {},
    create: {
      email: 'admin@pickamgo.gh',
      phone: '+233501111111',
      passwordHash: hashedPassword,
      name: 'Admin User',
      location: 'Accra',
      isAdmin: true,
      isSeller: true,
      emailVerified: true,
    },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    })
  }

  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } })
  const sellerRole = await prisma.role.findUnique({ where: { name: 'SELLER' } })
  const riderRole = await prisma.role.findUnique({ where: { name: 'RIDER' } })

  if (userRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demoUser.id, roleId: userRole.id } },
      update: {},
      create: { userId: demoUser.id, roleId: userRole.id },
    })
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demoUser.id, roleId: sellerRole!.id } },
      update: {},
      create: { userId: demoUser.id, roleId: sellerRole!.id },
    })
  }

  if (riderRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: riderUser.id, roleId: riderRole.id } },
      update: {},
      create: { userId: riderUser.id, roleId: riderRole.id },
    })
  }

  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: { userId: riderUser.id, isOnline: false, isAvailable: false },
  })

  const shop = await prisma.shop.upsert({
    where: { slug: 'campus-glow' },
    update: {},
    create: {
      name: 'Campus Glow',
      slug: 'campus-glow',
      logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=400&fit=crop',
      description: 'Beauty, nails and skincare for your next glow-up. Serving the Legon campus community since 2022.',
      location: 'Legon, Accra',
      area: 'Legon',
      campus: 'University of Ghana',
      openingHours: '9:00 AM - 8:00 PM',
      status: 'ACTIVE',
      verificationStatus: 'APPROVED',
      isVerified: true,
      platformDeliveryFee: 15,
      ownerId: demoUser.id,
    },
  })

  const beautyCategory = await prisma.category.upsert({
    where: { id: 'beauty' },
    update: {},
    create: { id: 'beauty', name: 'Beauty', emoji: '💅🏽', color: 'bg-pink-100 text-pink-800' },
  })

  const foodCategory = await prisma.category.upsert({
    where: { id: 'food' },
    update: {},
    create: { id: 'food', name: 'Food', emoji: '🍔', color: 'bg-orange-100 text-orange-800' },
  })

  const fashionCategory = await prisma.category.upsert({
    where: { id: 'fashion' },
    update: {},
    create: { id: 'fashion', name: 'Fashion', emoji: '👕', color: 'bg-purple-100 text-purple-800' },
  })

  const electronicsCategory = await prisma.category.upsert({
    where: { id: 'electronics' },
    update: {},
    create: { id: 'electronics', name: 'Phones & Tech', emoji: '📱', color: 'bg-blue-100 text-blue-800' },
  })

  const product = await prisma.product.create({
    data: {
      name: 'Gel Nails Full Set',
      description: 'Professional gel nail application with your choice of color. Long-lasting, chip-resistant finish.',
      price: 80,
      originalPrice: 120,
      discount: 33,
      stock: 10,
      categoryId: beautyCategory.id,
      shopId: shop.id,
      sellerId: demoUser.id,
      location: 'Legon, Accra',
      area: 'Legon',
      campus: 'University of Ghana',
      isTrending: true,
      isNew: true,
      status: 'ACTIVE',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop', sortOrder: 0 },
        ],
      },
      variants: {
        create: [
          { name: 'Natural/Neutral', price: 80, stock: 5, sortOrder: 0 },
          { name: 'Pink Glitter', price: 90, stock: 3, sortOrder: 1 },
          { name: 'French Tips', price: 85, stock: 2, sortOrder: 2 },
        ],
      },
    },
  })

  const nailsCategory = await prisma.shopCategory.upsert({
    where: { id: `cat-${shop.id}-nails` },
    update: {},
    create: {
      id: `cat-${shop.id}-nails`,
      shopId: shop.id,
      name: 'Nails',
      description: 'Gel and acrylic nail services',
      sortOrder: 0,
    },
  })

  const hairCategory = await prisma.shopCategory.upsert({
    where: { id: `cat-${shop.id}-hair` },
    update: {},
    create: {
      id: `cat-${shop.id}-hair`,
      shopId: shop.id,
      name: 'Hair',
      description: 'Hair styling and braiding',
      sortOrder: 1,
    },
  })

  const service = await prisma.service.create({
    data: {
      name: 'Gel Nails - Full Set',
      description: 'Premium gel nail application with long-lasting chip-resistant finish.',
      price: 80,
      duration: '45 mins',
      categoryId: beautyCategory.id,
      shopId: shop.id,
      providerId: demoUser.id,
      location: 'Legon, Accra',
      area: 'Legon',
      campus: 'University of Ghana',
      isVerified: true,
      isTrending: true,
      status: 'ACTIVE',
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop', sortOrder: 0 },
        ],
      },
      availability: {
        create: [
          { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], timeSlots: '14:00,16:00', isAvailable: true },
          { date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], timeSlots: '10:00,11:00,14:00', isAvailable: true },
        ],
      },
    },
  })

  console.log('✅ Seeding completed!')
  console.log('Demo seller email: demo@pickamgo.gh')
  console.log('Demo rider email: rider@pickamgo.gh')
  console.log('Demo admin email: admin@pickamgo.gh')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
