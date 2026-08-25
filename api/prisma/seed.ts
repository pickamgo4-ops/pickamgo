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

  // ===========================================
  // TEMPORARY DEMO MARKETING SHOPS
  // Remove later by running:
  //   DELETE FROM "ProductImage" WHERE productId IN (SELECT id FROM "Product" WHERE shopId IN (SELECT id FROM "Shop" WHERE name LIKE 'DEMO_PICKAMGO_%'));
  //   DELETE FROM "Product" WHERE shopId IN (SELECT id FROM "Shop" WHERE name LIKE 'DEMO_PICKAMGO_%');
  //   DELETE FROM "ShopCategory" WHERE shopId IN (SELECT id FROM "Shop" WHERE name LIKE 'DEMO_PICKAMGO_%');
  //   DELETE FROM "Shop" WHERE name LIKE 'DEMO_PICKAMGO_%';
  // ===========================================

  const demoSeller = await prisma.user.findUnique({ where: { email: 'demo@pickamgo.gh' } })
  if (!demoSeller) {
    throw new Error('Demo seller user not found')
  }

  const demoShopDefs = [
    {
      id: 'demo-shop-01',
      slug: 'demo-pickamgo-01-kente-styles',
      name: 'DEMO_PICKAMGO_01 - Kente Styles',
      description: 'Authentic Ghanaian fashion house specializing in modern kente blazers, Ankara dresses, and custom-made traditional wear for every occasion.',
      location: 'Osu, Accra',
      area: 'Osu',
      logo: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 9:00 AM - 8:00 PM',
      category: 'Fashion',
      products: [
        { id: 'demo-prod-01-01', name: 'Kente Blazer', description: 'Modern slim-fit blazer with handwoven kente accents on the lapel. Perfect for weddings and corporate events.', price: 450, originalPrice: 600, discount: 25, stock: 15, categoryId: fashionCategory.id, location: 'Osu, Accra', area: 'Osu', isTrending: true, isNew: true },
        { id: 'demo-prod-01-02', name: 'Ankara Shift Dress', description: 'Vibrant Ankara print shift dress, custom tailored in sizes S-XL.', price: 280, originalPrice: 350, discount: 20, stock: 20, categoryId: fashionCategory.id, location: 'Osu, Accra', area: 'Osu', isTrending: false, isNew: true },
        { id: 'demo-prod-01-03', name: 'Ghana Flag Tee', description: 'Premium cotton t-shirt with subtle Ghana flag embroidery. Unisex fit.', price: 120, originalPrice: null, discount: null, stock: 50, categoryId: fashionCategory.id, location: 'Osu, Accra', area: 'Osu', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-02',
      slug: 'demo-pickamgo-02-tech-hub',
      name: 'DEMO_PICKAMGO_02 - Tech Hub Ghana',
      description: 'Your one-stop shop for laptops, smartphones, and accessories. Authorized dealer for top brands with genuine products and warranty.',
      location: 'Ringway, Accra',
      area: 'Ringway',
      logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=400&fit=crop',
      openingHours: 'Mon-Fri 8:30 AM - 6:30 PM, Sat 9:00 AM - 5:00 PM',
      category: 'Electronics',
      products: [
        { id: 'demo-prod-02-01', name: 'Wireless Earbuds Pro', description: 'True wireless earbuds with ANC, 24hr battery life, and IPX5 water resistance.', price: 320, originalPrice: 450, discount: 29, stock: 30, categoryId: electronicsCategory.id, location: 'Ringway, Accra', area: 'Ringway', isTrending: true, isNew: true },
        { id: 'demo-prod-02-02', name: 'USB-C Fast Charger 65W', description: 'Gan-based fast charger compatible with laptops and phones. Compact and travel-friendly.', price: 95, originalPrice: 140, discount: 32, stock: 100, categoryId: electronicsCategory.id, location: 'Ringway, Accra', area: 'Ringway', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-03',
      slug: 'demo-pickamgo-03-glamour-box',
      name: 'DEMO_PICKAMGO_03 - Glamour Box',
      description: 'Premium cosmetics and skincare shop. Imported luxury brands and local organic beauty products for every skin type.',
      location: 'East Legon, Accra',
      area: 'East Legon',
      logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 10:00 AM - 7:00 PM, Sun 12:00 PM - 5:00 PM',
      category: 'Beauty',
      products: [
        { id: 'demo-prod-03-01', name: 'Vitamin C Brightening Serum', description: '30ml hyaluronic acid + vitamin C serum for glowing skin. Made in Ghana.', price: 180, originalPrice: 220, discount: 18, stock: 40, categoryId: beautyCategory.id, location: 'East Legon, Accra', area: 'East Legon', isTrending: true, isNew: true },
        { id: 'demo-prod-03-02', name: 'Matte Lipstick Set', description: 'Set of 4 long-wearing matte lipsticks in popular Ghanaian skin-tone shades.', price: 150, originalPrice: 200, discount: 25, stock: 25, categoryId: beautyCategory.id, location: 'East Legon, Accra', area: 'East Legon', isTrending: false, isNew: true },
        { id: 'demo-prod-03-03', name: 'Shea Butter Moisturizer', description: '100% organic shea butter with coconut oil. 500ml tub.', price: 85, originalPrice: null, discount: null, stock: 60, categoryId: beautyCategory.id, location: 'East Legon, Accra', area: 'East Legon', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-04',
      slug: 'demo-pickamgo-04-taste-of-ghana',
      name: 'DEMO_PICKAMGO_04 - Taste of Ghana',
      description: 'Traditional Ghanaian cuisine delivered fresh. From jollof to waakye, enjoy home-cooked meals prepared with love.',
      location: 'Labone, Accra',
      area: 'Labone',
      logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sun 10:00 AM - 9:00 PM',
      category: 'Food',
      products: [
        { id: 'demo-prod-04-01', name: 'Jollof Rice Special', description: 'Party-style jollof rice with fried chicken and salad. Serves 2.', price: 120, originalPrice: null, discount: null, stock: 50, categoryId: foodCategory.id, location: 'Labone, Accra', area: 'Labone', isTrending: true, isNew: false },
        { id: 'demo-prod-04-02', name: 'Waakye Pack', description: 'Traditional waakye with millet, spaghetti, fried fish, and boiled eggs.', price: 65, originalPrice: 80, discount: 19, stock: 40, categoryId: foodCategory.id, location: 'Labone, Accra', area: 'Labone', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-05',
      slug: 'demo-pickamgo-05-phone-palace',
      name: 'DEMO_PICKAMGO_05 - Phone Palace',
      description: 'Ghana\'s trusted phone and accessories store. Brand new and certified pre-owned smartphones with warranty.',
      location: 'Makola, Accra',
      area: 'Makola',
      logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 8:00 AM - 7:00 PM',
      category: 'Electronics',
      products: [
        { id: 'demo-prod-05-01', name: 'Samsung A15 Screen Protector', description: 'Tempered glass screen protector for Samsung Galaxy A15. Pack of 2.', price: 25, originalPrice: 40, discount: 38, stock: 200, categoryId: electronicsCategory.id, location: 'Makola, Accra', area: 'Makola', isTrending: false, isNew: false },
        { id: 'demo-prod-05-02', name: 'Fast Charging Cable 2M', description: 'USB-C to USB-C braided cable, 2 meters, 65W PD support.', price: 35, originalPrice: 55, discount: 36, stock: 150, categoryId: electronicsCategory.id, location: 'Makola, Accra', area: 'Makola', isTrending: true, isNew: true },
      ],
    },
    {
      id: 'demo-shop-06',
      slug: 'demo-pickamgo-06-comfort-living',
      name: 'DEMO_PICKAMGO_06 - Comfort Living',
      description: 'Modern furniture and home decor at affordable prices. Beds, sofas, dining sets, and room accessories for every home.',
      location: 'Tema',
      area: 'Tema',
      logo: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 9:00 AM - 6:00 PM',
      category: 'Furniture',
      products: [
        { id: 'demo-prod-06-01', name: 'L-Shape Sofa Set', description: 'Modern L-shaped sofa with ottoman. Grey fabric, seats 5 comfortably.', price: 3200, originalPrice: 4500, discount: 29, stock: 5, categoryId: fashionCategory.id, location: 'Tema', area: 'Tema', isTrending: false, isNew: true },
        { id: 'demo-prod-06-02', name: 'Oak Dining Table', description: 'Solid oak dining table with 6 chairs. 180cm length.', price: 2800, originalPrice: null, discount: null, stock: 3, categoryId: fashionCategory.id, location: 'Tema', area: 'Tema', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-07',
      slug: 'demo-pickamgo-07-sole-mates',
      name: 'DEMO_PICKAMGO_07 - Sole Mates',
      description: 'Trendy shoes for every occasion. Sneakers, loafers, sandals, and formal shoes for men and women.',
      location: 'Adenta, Accra',
      area: 'Adenta',
      logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 9:00 AM - 7:00 PM',
      category: 'Fashion',
      products: [
        { id: 'demo-prod-07-01', name: 'Air Walk Sneakers', description: 'Lightweight mesh sneakers with memory foam insoles. Unisex.', price: 280, originalPrice: 380, discount: 26, stock: 25, categoryId: fashionCategory.id, location: 'Adenta, Accra', area: 'Adenta', isTrending: true, isNew: true },
        { id: 'demo-prod-07-02', name: 'Leather Loafer', description: 'Genuine leather loafer with rubber sole. Perfect for office and casual wear.', price: 350, originalPrice: null, discount: null, stock: 12, categoryId: fashionCategory.id, location: 'Adenta, Accra', area: 'Adenta', isTrending: false, isNew: false },
      ],
    },
    {
      id: 'demo-shop-08',
      slug: 'demo-pickamgo-08-fresh-market',
      name: 'DEMO_PICKAMGO_08 - Fresh Market',
      description: 'Fresh groceries, organic vegetables, fruits, and daily essentials delivered straight to your door.',
      location: 'Madina, Accra',
      area: 'Madina',
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sun 6:00 AM - 8:00 PM',
      category: 'Food',
      products: [
        { id: 'demo-prod-08-01', name: 'Organic Vegetable Box', description: 'Fresh mixed vegetables including tomatoes, onions, carrots, and cabbage. 5kg box.', price: 95, originalPrice: 120, discount: 21, stock: 30, categoryId: foodCategory.id, location: 'Madina, Accra', area: 'Madina', isTrending: true, isNew: false },
        { id: 'demo-prod-08-02', name: 'Tropical Fruit Basket', description: 'Assorted tropical fruits: mangoes, pineapples, bananas, and oranges. 3kg basket.', price: 110, originalPrice: null, discount: null, stock: 20, categoryId: foodCategory.id, location: 'Madina, Accra', area: 'Madina', isTrending: false, isNew: true },
      ],
    },
    {
      id: 'demo-shop-09',
      slug: 'demo-pickamgo-09-autocare',
      name: 'DEMO_PICKAMGO_09 - AutoCare Ghana',
      description: 'Quality auto parts and accessories for all car models. Engine oils, brake pads, filters, and more.',
      location: 'Kaneshie, Accra',
      area: 'Kaneshie',
      logo: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 7:30 AM - 6:00 PM',
      category: 'Automotive',
      products: [
        { id: 'demo-prod-09-01', name: 'Synthetic Engine Oil 5L', description: '5W-30 fully synthetic engine oil. Suitable for most modern vehicles.', price: 180, originalPrice: 220, discount: 18, stock: 40, categoryId: electronicsCategory.id, location: 'Kaneshie, Accra', area: 'Kaneshie', isTrending: false, isNew: false },
        { id: 'demo-prod-09-02', name: 'Ceramic Brake Pads', description: 'Front brake pad set. Low dust, quiet operation. Fits Toyota and Honda models.', price: 240, originalPrice: 300, discount: 20, stock: 15, categoryId: electronicsCategory.id, location: 'Kaneshie, Accra', area: 'Kaneshie', isTrending: true, isNew: true },
      ],
    },
    {
      id: 'demo-shop-10',
      slug: 'demo-pickamgo-10-gift-gallery',
      name: 'DEMO_PICKAMGO_10 - Gift Gallery',
      description: 'Unique gifts, souvenirs, and lifestyle products. Perfect for birthdays, weddings, and corporate gifting.',
      location: 'Airport Residential Area, Accra',
      area: 'Airport',
      logo: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop',
      banner: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=400&fit=crop',
      openingHours: 'Mon-Sat 10:00 AM - 6:00 PM',
      category: 'Lifestyle',
      products: [
        { id: 'demo-prod-10-01', name: 'Custom Name Necklace', description: 'Personalized gold-plated necklace with name or date engraving.', price: 95, originalPrice: 150, discount: 37, stock: 25, categoryId: fashionCategory.id, location: 'Airport Residential Area, Accra', area: 'Airport', isTrending: true, isNew: true },
        { id: 'demo-prod-10-02', name: 'Scented Candle Set', description: 'Set of 3 soy wax candles: shea butter, coconut, and vanilla. 50hr burn time each.', price: 130, originalPrice: 170, discount: 24, stock: 35, categoryId: fashionCategory.id, location: 'Airport Residential Area, Accra', area: 'Airport', isTrending: false, isNew: false },
        { id: 'demo-prod-10-03', name: 'Ghana-Themed Notebook', description: 'Hardcover notebook with kente-pattern cover and 200 lined pages.', price: 45, originalPrice: null, discount: null, stock: 80, categoryId: fashionCategory.id, location: 'Airport Residential Area, Accra', area: 'Airport', isTrending: false, isNew: false },
      ],
    },
  ]

  for (const def of demoShopDefs) {
    const shop = await prisma.shop.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        slug: def.slug,
        name: def.name,
        description: def.description,
        location: def.location,
        area: def.area,
        logo: def.logo,
        banner: def.banner,
        openingHours: def.openingHours,
        status: 'ACTIVE',
        verificationStatus: 'APPROVED',
        isVerified: true,
        isOpen: true,
        deliveryAvailable: true,
        pickupAvailable: true,
        platformDeliveryFee: 15,
        ownerId: demoSeller.id,
      },
      include: { owner: { select: { id: true, name: true, avatar: true } } },
    })

    const catId = `demo-cat-${def.id.split('-')[2]}`
    await prisma.shopCategory.upsert({
      where: { id: catId },
      update: {},
      create: {
        id: catId,
        shopId: shop.id,
        name: def.category,
        description: `${def.category} products`,
        sortOrder: 0,
      },
    })

    for (const productDef of def.products) {
      await prisma.product.upsert({
        where: { id: productDef.id },
        update: {},
        create: {
          ...productDef,
          shopId: shop.id,
          sellerId: demoSeller.id,
          condition: 'new',
          rating: 0,
          reviewsCount: 0,
          status: 'ACTIVE',
          images: {
            create: [
              { url: `https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&sig=${productDef.id}`, sortOrder: 0 },
            ],
          },
        },
      })
    }
  }

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
