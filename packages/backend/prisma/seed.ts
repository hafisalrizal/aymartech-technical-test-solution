import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from root .env
config({ path: join(__dirname, '..', '..', '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password', 10);

  // Create or update test user
  const user = await prisma.user.upsert({
    where: { email: 'test@lmesh.eu' },
    update: {},
    create: {
      email: 'test@lmesh.eu',
      password: hashedPassword,
    },
  });

  console.log(`Created/updated user: ${user.email}`);

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Premium SUV Interior',
      description: 'Warm earth tones, matte leather, sustainable materials for a luxury SUV interior',
      userId: user.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Electric Sedan Dashboard',
      description: 'Minimalist design with ambient lighting and recycled ocean plastics',
      userId: user.id,
    },
  });

  console.log(`Created/updated projects: ${project1.title}, ${project2.title}`);

  // Create sample messages for project1
  await prisma.message.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      role: 'user',
      content: 'What color palette would work best for a luxury SUV interior with earth tones?',
      projectId: project1.id,
    },
  });

  await prisma.message.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      role: 'assistant',
      content: 'For a luxury SUV interior with earth tones, I recommend a palette centered around:\n\n1. **Primary**: Cognac brown or saddle tan leather\n2. **Secondary**: Warm charcoal or deep espresso\n3. **Accent**: Brushed bronze or copper metallic trim\n4. **Neutral**: Cream or sand for contrast\n\nThis combination creates a sophisticated, natural feel that appeals to premium buyers while maintaining warmth and comfort.',
      projectId: project1.id,
    },
  });

  console.log('Created sample messages');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
