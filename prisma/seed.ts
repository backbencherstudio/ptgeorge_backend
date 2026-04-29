import { PrismaClient } from '../prisma/generated/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import appConfig from '../src/config/app.config';

const connectionString = appConfig().database.url;

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Superadmin data
const superadminData = {
  first_name: 'System',
  last_name: 'Admin',
  username: appConfig().defaultUser.system.username,
  email: appConfig().defaultUser.system.email,
  password: appConfig().defaultUser.system.password,
  phone_number: '+1234567890',
  church_name: 'System Administration',
  language: 'en',
  type: 'SUPER_ADMIN' as const,
  status: 1,
};

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create Superadmin User
    console.log('📝 Creating superadmin user...');
    const hashedPassword = await hashPassword(superadminData.password);

    const superadmin = await prisma.user.upsert({
      where: { email: superadminData.email },
      update: {},
      create: {
        id: randomUUID(),
        first_name: superadminData.first_name,
        last_name: superadminData.last_name,
        username: superadminData.username,
        email: superadminData.email,
        password: hashedPassword,
        phone_number: superadminData.phone_number,
        church_name: superadminData.church_name,
        language: superadminData.language,
        type: superadminData.type,
        status: superadminData.status,
        email_verified_at: new Date(),
      },
    });

    console.log(`✅ Superadmin created successfully!`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Password: ${superadminData.password}`);
    console.log(`   Type: ${superadmin.type}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Seeding completed!');
  });
