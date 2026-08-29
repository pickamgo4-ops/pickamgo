const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'PasswordResetToken'
    `;
    console.log('Table exists:', result);
  } catch (error) {
    console.log('Error checking table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
