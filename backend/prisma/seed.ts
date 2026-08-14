import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst();
  if (existingAdmin) {
    console.log('Seed skipped — database already initialized');
    return;
  }

  const adminRole = await prisma.role.upsert({
    where: { nom: 'admin' },
    update: {},
    create: { nom: 'admin', description: 'Administrateur' },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: 'admin@residence.local',
      passwordHash,
      nom: 'Admin',
      prenom: 'Principal',
      roleId: adminRole.id,
    },
  });

  console.log('Seed OK — admin@residence.local / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
