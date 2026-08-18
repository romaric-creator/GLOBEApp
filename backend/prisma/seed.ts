import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst();
  if (existingAdmin) {
    console.log('Seed skipped — database already initialized');
    return;
  }

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { nom: 'admin' },
    update: {},
    create: { nom: 'admin', description: 'Administrateur' },
  });

  await prisma.role.upsert({
    where: { nom: 'receptionniste' },
    update: {},
    create: { nom: 'receptionniste', description: 'Réceptionniste' },
  });

  await prisma.role.upsert({
    where: { nom: 'caissier' },
    update: {},
    create: { nom: 'caissier', description: 'Caissier' },
  });

  // Admin user
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

  // Chambres
  const chambres = [
    // Standard (C 101 - C 106)
    { numero: 'C 101', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 102', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 103', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 104', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 105', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 106', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    // Junior (C 108 - C 109)
    { numero: 'C 108', type: 'JUNIOR', prixNuit: 20000, etage: 1, capacite: 2 },
    { numero: 'C 109', type: 'JUNIOR', prixNuit: 20000, etage: 1, capacite: 2 },
    // Junior Plus (C 107, C 110, C 202)
    { numero: 'C 107', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 1, capacite: 3 },
    { numero: 'C 110', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 1, capacite: 3 },
    { numero: 'C 202', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 2, capacite: 3 },
    // Senior (C 201)
    { numero: 'C 201', type: 'SENIOR', prixNuit: 35000, etage: 2, capacite: 4 },
    // Studios
    { numero: 'S 111', type: 'STUDIO', prixNuit: 20000, etage: 1, capacite: 2 },
    { numero: 'S 204', type: 'STUDIO', prixNuit: 25000, etage: 2, capacite: 2 },
    { numero: 'S 205', type: 'STUDIO', prixNuit: 25000, etage: 2, capacite: 2 },
    { numero: 'S 206', type: 'STUDIO', prixNuit: 28000, etage: 2, capacite: 3 },
    // Appartements
    { numero: 'A 203', type: 'APPARTEMENT', prixNuit: 40000, etage: 2, capacite: 4 },
    { numero: 'A 306', type: 'APPARTEMENT', prixNuit: 40000, etage: 3, capacite: 4 },
  ] as const;

  for (const ch of chambres) {
    await prisma.chambre.create({
      data: {
        numero: ch.numero,
        type: ch.type,
        prixNuit: ch.prixNuit,
        etage: ch.etage,
        capacite: ch.capacite,
        statut: 'DISPONIBLE',
      },
    });
  }

  // Type de reservation salle de fete
  await prisma.typeReservationSalle.create({
    data: {
      nom: 'Salle de fête',
      description: 'Location par jour',
      prixBase: 50000,
    },
  });

  console.log('Seed OK — admin@residence.local / admin123');
  console.log('  18 chambres créées (6 Standard, 2 Junior, 3 Junior Plus, 1 Senior, 4 Studios, 2 Appartements)');
  console.log('  1 type de salle de fête créé');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
