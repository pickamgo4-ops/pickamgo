import { PrismaClient } from '@prisma/client'
import { seedMarketplaceCategories } from '../prisma/category-catalog'

const prisma = new PrismaClient()

async function main() {
  await seedMarketplaceCategories(prisma)
  console.log('Marketplace categories seeded successfully.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
