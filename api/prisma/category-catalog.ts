import { PrismaClient } from '@prisma/client'

type CategoryDefinition = {
  id: string
  name: string
  description: string
  emoji: string
  color: string
  children: string[]
}

const categoryDefinitions: CategoryDefinition[] = [
  { id: 'electronics', name: 'Electronics', description: 'Phones, computers, home electronics, and accessories', emoji: '📱', color: 'bg-blue-100 text-blue-800', children: ['Phones & Smartphones', 'Phone Accessories', 'Laptops', 'Tablets', 'Computers & Accessories', 'Monitors', 'TVs', 'Cameras', 'Gaming', 'Gaming Consoles', 'Headphones & Earbuds', 'Speakers', 'Smartwatches', 'Smart Home', 'Networking', 'Storage Devices', 'Chargers & Cables', 'Power Banks', 'Printers & Scanners', 'Other Electronics'] },
  { id: 'fashion', name: 'Fashion', description: 'Clothing, shoes, bags, and fashion accessories', emoji: '👕', color: 'bg-purple-100 text-purple-800', children: ["Men's Clothing", "Women's Clothing", "Children's Clothing", 'Shoes', 'Sneakers', 'Sandals', 'Bags', 'Handbags', 'Backpacks', 'Watches', 'Jewelry', 'Accessories', 'Sunglasses', 'Belts', 'Hats & Caps', 'Traditional Wear', 'Sportswear', 'Underwear', 'Fashion Accessories', 'African Fashion', 'Local Crafts', 'Handmade Products'] },
  { id: 'beauty', name: 'Beauty & Personal Care', description: 'Skincare, hair, makeup, grooming, and personal hygiene', emoji: '💅', color: 'bg-pink-100 text-pink-800', children: ['Skincare', 'Hair Care', 'Hair Extensions & Wigs', 'Makeup', 'Fragrances', 'Perfumes', 'Body Care', 'Bath & Shower', "Men's Grooming", "Women's Grooming", 'Nail Care', 'Beauty Tools', 'Personal Hygiene', 'Local Beauty Products'] },
  { id: 'home-furniture', name: 'Home & Living', description: 'Furniture, decor, kitchen, appliances, and household essentials', emoji: '🏠', color: 'bg-yellow-100 text-yellow-800', children: ['Furniture', 'Home Decor', 'Kitchen', 'Dining', 'Bedding', 'Bathroom', 'Lighting', 'Curtains & Blinds', 'Storage & Organization', 'Cleaning Supplies', 'Home Appliances', 'Garden & Outdoor', 'Home Improvement', 'Household Items', 'Handmade Furniture'] },
  { id: 'food', name: 'Food & Groceries', description: 'Groceries, fresh food, snacks, drinks, and local foods', emoji: '🍔', color: 'bg-orange-100 text-orange-800', children: ['Groceries', 'Snacks', 'Drinks', 'Fresh Food', 'Fruits & Vegetables', 'Meat & Seafood', 'Bakery', 'Cakes', 'Desserts', 'Cooking Ingredients', 'Spices', 'Baby Food', 'Packaged Food', 'Local Food', 'Local Snacks & Foods', 'Farm Produce'] },
  { id: 'phones-tablets', name: 'Phones & Mobile', description: 'Smartphones, feature phones, parts, and mobile accessories', emoji: '📲', color: 'bg-cyan-100 text-cyan-800', children: ['Smartphones', 'Feature Phones', 'Phone Cases', 'Screen Protectors', 'Chargers', 'Cables', 'Earphones', 'Power Banks', 'Phone Stands', 'Replacement Parts'] },
  { id: 'computers-electronics', name: 'Computers & Technology', description: 'Computers, components, software, and networking equipment', emoji: '💻', color: 'bg-indigo-100 text-indigo-800', children: ['Laptops', 'Desktop Computers', 'Computer Accessories', 'Keyboards', 'Mice', 'Monitors', 'Webcams', 'Microphones', 'USB Devices', 'Hard Drives', 'SSDs', 'RAM', 'Computer Components', 'Software', 'Networking Equipment'] },
  { id: 'health-wellness', name: 'Health & Wellness', description: 'Fitness, wellness, personal care, and approved health accessories', emoji: '🧘', color: 'bg-green-100 text-green-800', children: ['Fitness Equipment', 'Sports Equipment', 'Vitamins & Supplements', 'Personal Care', 'Wellness Products', 'Medical Accessories', 'Fitness Accessories'] },
  { id: 'baby-kids', name: 'Baby & Kids', description: 'Baby essentials, toys, clothing, and school items', emoji: '🧸', color: 'bg-amber-100 text-amber-800', children: ['Baby Clothing', 'Baby Shoes', 'Baby Care', 'Diapers', 'Feeding', 'Strollers', 'Toys', 'Educational Toys', 'School Supplies', 'Kids Furniture', 'Kids Accessories'] },
  { id: 'sports-fitness', name: 'Sports & Fitness', description: 'Sports gear, equipment, clothing, and outdoor activities', emoji: '⚽', color: 'bg-lime-100 text-lime-800', children: ['Football', 'Basketball', 'Boxing', 'Gym Equipment', 'Running', 'Cycling', 'Swimming', 'Sportswear', 'Sports Shoes', 'Fitness Accessories', 'Outdoor Sports'] },
  { id: 'automotive', name: 'Automotive', description: 'Cars, motorcycles, parts, tools, and vehicle accessories', emoji: '🚗', color: 'bg-gray-100 text-gray-800', children: ['Cars', 'Motorcycles', 'Car Accessories', 'Car Electronics', 'Car Care', 'Tyres', 'Wheels & Rims', 'Spare Parts', 'Motorcycle Accessories', 'Tools', 'Interior Accessories', 'Exterior Accessories', 'Automotive Services'] },
  { id: 'books-music-media', name: 'Books & Education', description: 'Books, study materials, stationery, and educational technology', emoji: '📚', color: 'bg-teal-100 text-teal-800', children: ['Books', 'Textbooks', 'Novels', 'School Supplies', 'Stationery', 'Art Supplies', 'Office Supplies', 'Educational Materials', 'Study Materials', 'Educational Technology', 'Ghanaian Books'] },
  { id: 'office-stationery', name: 'Office & Business', description: 'Office furniture, electronics, paper, and business supplies', emoji: '🏢', color: 'bg-slate-100 text-slate-800', children: ['Office Furniture', 'Office Electronics', 'Printers', 'Paper', 'Stationery', 'Business Supplies', 'Packaging', 'POS Equipment', 'Office Accessories'] },
  { id: 'tools-hardware', name: 'Tools & Hardware', description: 'Tools, building materials, electrical, plumbing, and safety supplies', emoji: '🔧', color: 'bg-stone-100 text-stone-800', children: ['Hand Tools', 'Power Tools', 'Building Materials', 'Electrical', 'Plumbing', 'Hardware', 'Safety Equipment', 'Workshop Equipment', 'Paint & Decorating', 'Construction Supplies'] },
  { id: 'agriculture', name: 'Agriculture', description: 'Farm equipment, produce, seeds, and agricultural supplies', emoji: '🌾', color: 'bg-emerald-100 text-emerald-800', children: ['Farm Equipment', 'Farming Tools', 'Seeds', 'Fertilizers', 'Animal Feed', 'Livestock Supplies', 'Poultry Supplies', 'Gardening', 'Irrigation', 'Agricultural Accessories', 'Farm Produce'] },
  { id: 'pets-animals', name: 'Pets & Animals', description: 'Pet food, accessories, toys, grooming, and animal care', emoji: '🐾', color: 'bg-orange-100 text-orange-800', children: ['Pet Food', 'Pet Accessories', 'Pet Toys', 'Pet Grooming', 'Pet Housing', 'Animal Care Products'] },
  { id: 'events-entertainment', name: 'Entertainment', description: 'Music, movies, games, parties, events, and collectibles', emoji: '🎉', color: 'bg-rose-100 text-rose-800', children: ['Musical Instruments', 'Audio Equipment', 'Movies', 'Games', 'Gaming Accessories', 'Party Supplies', 'Event Supplies', 'Collectibles', 'Local Art'] },
  { id: 'jewelry-accessories', name: 'Jewelry & Accessories', description: 'Jewelry, watches, sets, and personal accessories', emoji: '💍', color: 'bg-fuchsia-100 text-fuchsia-800', children: ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Watches', 'Jewelry Sets', 'Fashion Jewelry', 'Accessories'] },
  { id: 'travel-luggage', name: 'Travel & Luggage', description: 'Suitcases, travel bags, camping, and outdoor equipment', emoji: '🧳', color: 'bg-sky-100 text-sky-800', children: ['Suitcases', 'Travel Bags', 'Backpacks', 'Travel Accessories', 'Camping', 'Outdoor Equipment', 'Travel Organizers'] },
  { id: 'services', name: 'Services', description: 'Local, creative, household, technical, and professional services', emoji: '🛠', color: 'bg-violet-100 text-violet-800', children: ['Cleaning', 'Hair & Beauty', 'Photography', 'Graphic Design', 'Web Development', 'Repairs', 'Tutoring', 'Catering', 'Event Planning', 'Transportation', 'Moving Services', 'Plumbing', 'Electrical Services', 'Painting & Decoration', 'Computer Repairs', 'Phone Repairs'] },
]

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function seedMarketplaceCategories(prisma: PrismaClient) {
  for (const [displayOrder, definition] of categoryDefinitions.entries()) {
    const parent = await prisma.category.upsert({
      where: { id: definition.id },
      update: { name: definition.name, slug: definition.id, description: definition.description, emoji: definition.emoji, color: definition.color, displayOrder, isActive: true },
      create: { id: definition.id, name: definition.name, slug: definition.id, description: definition.description, emoji: definition.emoji, color: definition.color, displayOrder, isActive: true },
    })

    for (const [childOrder, name] of definition.children.entries()) {
      const slug = `${definition.id}-${slugify(name)}`
      await prisma.category.upsert({
        where: { slug },
        update: { name, parentId: parent.id, displayOrder: childOrder, isActive: true },
        create: { name, slug, parentId: parent.id, description: `${name} in ${definition.name}`, emoji: definition.emoji, color: definition.color, displayOrder: childOrder, isActive: true },
      })
    }
  }
}
