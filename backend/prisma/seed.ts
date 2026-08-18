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

  // Categories restaurant
  const catPetitDej = await prisma.categorie.create({
    data: { nom: 'Petit déjeuné', description: 'Petit déjeuner' },
  });
  const catTradi = await prisma.categorie.create({
    data: { nom: 'Plats traditionnels', description: 'Plats traditionnels camerounais' },
  });
  const catAccomp = await prisma.categorie.create({
    data: { nom: 'Accompagnements', description: 'Accompagnements' },
  });
  const catSupp = await prisma.categorie.create({
    data: { nom: 'Suppléments', description: 'Suppléments viande/poisson' },
  });
  const catSpecial = await prisma.categorie.create({
    data: { nom: 'Spécial weekend', description: 'Plats spéciaux du weekend' },
  });
  const catDejDin = await prisma.categorie.create({
    data: { nom: 'Déjeuner & Dîner', description: 'Plats principaux déjeuner et dîner' },
  });

  // Produits restaurant
  const produits = [
    // Petit déjeuné
    { ref: 'PDJ-001', nom: 'Spaghetti, oeuf', prixVente: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-002', nom: 'Omelette', prixVente: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-003', nom: 'Café', prixVente: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-004', nom: 'Thé', prixVente: 500, cat: catPetitDej.id },
    // Plats traditionnels
    { ref: 'TRD-001', nom: 'Ndolè', prixVente: 2500, cat: catTradi.id },
    { ref: 'TRD-002', nom: 'Eru', prixVente: 2500, cat: catTradi.id },
    { ref: 'TRD-003', nom: 'Sauce gombo', prixVente: 2500, cat: catTradi.id },
    { ref: 'TRD-004', nom: 'Légume sauté', prixVente: 2000, cat: catTradi.id },
    { ref: 'TRD-005', nom: 'NKondrè chèvre', prixVente: 3500, cat: catTradi.id },
    // Accompagnements
    { ref: 'ACC-001', nom: 'Frites / Vapeur / Alloco / Plantain', prixVente: 500, cat: catAccomp.id },
    { ref: 'ACC-002', nom: 'Riz blanc / Riz nature', prixVente: 500, cat: catAccomp.id },
    // Supplements
    { ref: 'SUP-001', nom: 'Supplément Bœuf', prixVente: 500, cat: catSupp.id },
    { ref: 'SUP-002', nom: 'Supplément Poulet', prixVente: 2000, cat: catSupp.id },
    { ref: 'SUP-003', nom: 'Supplément Porc', prixVente: 2500, cat: catSupp.id },
    { ref: 'SUP-004', nom: 'Supplément Poisson', prixVente: 3500, cat: catSupp.id },
    // Special weekend
    { ref: 'SPW-001', nom: 'Bouillon de boeuf', prixVente: 2000, cat: catSpecial.id },
    { ref: 'SPW-002', nom: 'Taro sauce jaune', prixVente: 2500, cat: catSpecial.id },
    // Dejeuner & Diner
    { ref: 'DJD-001', nom: 'Tripes sautées à l\'ail', prixVente: 2500, cat: catDejDin.id },
    { ref: 'DJD-002', nom: 'Riz cantonais poulet grillé', prixVente: 2500, cat: catDejDin.id },
    { ref: 'DJD-003', nom: 'Poulet basquaise', prixVente: 2500, cat: catDejDin.id },
    { ref: 'DJD-004', nom: 'Poulet DG (1/4, 1/2, 1)', prixVente: 5000, cat: catDejDin.id },
    { ref: 'DJD-005', nom: 'Rôti de poulet', prixVente: 2500, cat: catDejDin.id },
    { ref: 'DJD-006', nom: 'Rôti de porc', prixVente: 3000, cat: catDejDin.id },
    { ref: 'DJD-007', nom: 'Poisson bar', prixVente: 5000, cat: catDejDin.id },
    { ref: 'DJD-008', nom: 'Haricot blanc', prixVente: 2500, cat: catDejDin.id },
    { ref: 'DJD-009', nom: 'Escargot', prixVente: 3000, cat: catDejDin.id },
  ];

  for (const p of produits) {
    await prisma.produit.create({
      data: {
        reference: p.ref,
        nom: p.nom,
        prixAchat: 0,
        prixVente: p.prixVente,
        stockActuel: 100,
        seuilAlerte: 10,
        unite: 'portion',
        categorieId: p.cat,
      },
    });
  }

  console.log('Seed OK — admin@residence.local / admin123');
  console.log('  18 chambres créées');
  console.log('  6 catégories restaurant + 25 produits (menu)');
  console.log('  1 type de salle de fête');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
