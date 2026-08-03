import { PrismaClient, Permission } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const MODULES = [
  'auth',
  'ventes',
  'stock',
  'clients',
  'personnel',
  'comptabilite',
  'rapports',
  'sauvegarde',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

async function main() {
  const permissions: Permission[] = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, description: `${action} on ${module}` },
      });
      permissions.push(perm);
    }
  }

  const adminRole = await prisma.role.upsert({
    where: { nom: 'admin' },
    update: {},
    create: { nom: 'admin', description: 'Administrateur avec tous les droits' },
  });

  const managerRole = await prisma.role.upsert({
    where: { nom: 'manager' },
    update: {},
    create: { nom: 'manager', description: 'Manager de la residence' },
  });

  const caissierRole = await prisma.role.upsert({
    where: { nom: 'caissier' },
    update: {},
    create: { nom: 'caissier', description: 'Caissier point de vente' },
  });

  const employeRole = await prisma.role.upsert({
    where: { nom: 'employe' },
    update: {},
    create: { nom: 'employe', description: 'Employe standard' },
  });

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  const managerModules = ['ventes', 'stock', 'clients', 'personnel', 'rapports'];
  for (const perm of permissions.filter((p) => managerModules.includes(p.module))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  const caissierPerms = permissions.filter(
    (p) =>
      (p.module === 'ventes' && ['create', 'read'].includes(p.action)) ||
      (p.module === 'stock' && p.action === 'read') ||
      (p.module === 'clients' && ['create', 'read'].includes(p.action)),
  );
  for (const perm of caissierPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: caissierRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: caissierRole.id, permissionId: perm.id },
    });
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@residence.local' },
    update: {},
    create: {
      email: 'admin@residence.local',
      passwordHash,
      nom: 'Admin',
      prenom: 'System',
      telephone: '+213000000000',
      roleId: adminRole.id,
    },
  });

  console.log('Seed completed: roles, permissions, and admin user created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
