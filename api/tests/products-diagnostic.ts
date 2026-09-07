import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const productCount = await prisma.product.count()
  const shopCount = await prisma.shop.count({ where: { status: 'ACTIVE' } })
  console.log({ productCount, activeShopCount: shopCount })
}
main().finally(() => prisma.$disconnect())