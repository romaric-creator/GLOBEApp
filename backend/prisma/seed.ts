import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Caisses — always ensure they exist
  await prisma.caisse.upsert({
    where: { id: 'caisse-hotel' },
    update: {},
    create: { id: 'caisse-hotel', nom: 'Caisse Hotel', type: 'HOTEL', actif: true },
  });
  await prisma.caisse.upsert({
    where: { id: 'caisse-restaurant-bar' },
    update: {},
    create: { id: 'caisse-restaurant-bar', nom: 'Caisse Restaurant & Bar', type: 'RESTAURANT_BAR', actif: true },
  });

  const existingAdmin = await prisma.user.findFirst();
  if (existingAdmin) {
    console.log('Seed skipped — database already initialized (caisses ensured)');
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
    { numero: 'C 101', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 102', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 103', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 104', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 105', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 106', type: 'STANDARD', prixNuit: 15000, etage: 1, capacite: 2 },
    { numero: 'C 108', type: 'JUNIOR', prixNuit: 20000, etage: 1, capacite: 2 },
    { numero: 'C 109', type: 'JUNIOR', prixNuit: 20000, etage: 1, capacite: 2 },
    { numero: 'C 107', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 1, capacite: 3 },
    { numero: 'C 110', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 1, capacite: 3 },
    { numero: 'C 202', type: 'JUNIOR_PLUS', prixNuit: 25000, etage: 2, capacite: 3 },
    { numero: 'C 201', type: 'SENIOR', prixNuit: 35000, etage: 2, capacite: 4 },
    { numero: 'S 111', type: 'STUDIO', prixNuit: 20000, etage: 1, capacite: 2 },
    { numero: 'S 204', type: 'STUDIO', prixNuit: 25000, etage: 2, capacite: 2 },
    { numero: 'S 205', type: 'STUDIO', prixNuit: 25000, etage: 2, capacite: 2 },
    { numero: 'S 206', type: 'STUDIO', prixNuit: 28000, etage: 2, capacite: 3 },
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

  // ========== CATEGORIES RESTAURANT (parent) ==========
  const catRestaurant = await prisma.categorie.create({
    data: { nom: 'Restaurant', description: 'Menu des repas' },
  });

  const catPetitDej = await prisma.categorie.create({
    data: { nom: 'Petit déjeuné', description: 'Petit déjeuner', parentId: catRestaurant.id },
  });
  const catTradi = await prisma.categorie.create({
    data: { nom: 'Plats traditionnels', description: 'Plats traditionnels camerounais', parentId: catRestaurant.id },
  });
  const catAccomp = await prisma.categorie.create({
    data: { nom: 'Accompagnements', description: 'Accompagnements', parentId: catRestaurant.id },
  });
  const catSupp = await prisma.categorie.create({
    data: { nom: 'Suppléments', description: 'Suppléments viande/poisson', parentId: catRestaurant.id },
  });
  const catSpecial = await prisma.categorie.create({
    data: { nom: 'Spécial weekend', description: 'Plats spéciaux du weekend', parentId: catRestaurant.id },
  });
  const catDejDin = await prisma.categorie.create({
    data: { nom: 'Déjeuner & Dîner', description: 'Plats principaux déjeuner et dîner', parentId: catRestaurant.id },
  });

  // ========== CATEGORIES BOISSONS (parent) ==========
  const catBoissons = await prisma.categorie.create({
    data: { nom: 'Boissons', description: 'Menu des boissons' },
  });

  const catVinsBlancs = await prisma.categorie.create({
    data: { nom: 'Vins blancs', description: 'Vins blancs', parentId: catBoissons.id },
  });
  const catVinsRouges = await prisma.categorie.create({
    data: { nom: 'Vins rouges', description: 'Vins rouges', parentId: catBoissons.id },
  });
  const catVinsRoses = await prisma.categorie.create({
    data: { nom: 'Vins rosés', description: 'Vins rosés', parentId: catBoissons.id },
  });
  const catVinsMousseux = await prisma.categorie.create({
    data: { nom: 'Vins mousseux', description: 'Vins mousseux', parentId: catBoissons.id },
  });
  const catBieres = await prisma.categorie.create({
    data: { nom: 'Bières', description: 'Bières', parentId: catBoissons.id },
  });
  const catCocktailAlcool = await prisma.categorie.create({
    data: { nom: 'Cocktail alcoolisé', description: 'Cocktails avec alcool', parentId: catBoissons.id },
  });
  const catCocktailSans = await prisma.categorie.create({
    data: { nom: 'Cocktail sans alcool', description: 'Mocktails', parentId: catBoissons.id },
  });
  const catChampagne = await prisma.categorie.create({
    data: { nom: 'Champagne', description: 'Champagnes', parentId: catBoissons.id },
  });
  const catSansAlcool = await prisma.categorie.create({
    data: { nom: 'Boissons sans alcool', description: 'Soft drinks', parentId: catBoissons.id },
  });
  const catBoissonsAlcool = await prisma.categorie.create({
    data: { nom: 'Boissons alcoolisées', description: 'Bières et autres', parentId: catBoissons.id },
  });
  const catSpiritueux = await prisma.categorie.create({
    data: { nom: 'Spiritueux & Liqueurs', description: 'Whisky, vodka, etc.', parentId: catBoissons.id },
  });

  // ========== PRODUITS RESTAURANT ==========
  const produitsRestaurant = [
    // Petit dejeuner
    { ref: 'PDJ-001', nom: 'Spaghetti, oeuf', prix: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-002', nom: 'Omelette', prix: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-003', nom: 'Café', prix: 1000, cat: catPetitDej.id },
    { ref: 'PDJ-004', nom: 'Thé', prix: 500, cat: catPetitDej.id },
    // Plats traditionnels
    { ref: 'TRD-001', nom: 'Ndolè', prix: 2500, cat: catTradi.id },
    { ref: 'TRD-002', nom: 'Eru', prix: 2500, cat: catTradi.id },
    { ref: 'TRD-003', nom: 'Sauce gombo', prix: 2500, cat: catTradi.id },
    { ref: 'TRD-004', nom: 'Légume sauté', prix: 2000, cat: catTradi.id },
    { ref: 'TRD-005', nom: 'NKondrè chèvre', prix: 3500, cat: catTradi.id },
    // Accompagnements
    { ref: 'ACC-001', nom: 'Frites / Vapeur / Alloco / Plantain', prix: 500, cat: catAccomp.id },
    { ref: 'ACC-002', nom: 'Riz blanc / Riz nature', prix: 500, cat: catAccomp.id },
    // Supplements
    { ref: 'SUP-001', nom: 'Supplément Bœuf', prix: 500, cat: catSupp.id },
    { ref: 'SUP-002', nom: 'Supplément Poulet', prix: 2000, cat: catSupp.id },
    { ref: 'SUP-003', nom: 'Supplément Porc', prix: 2500, cat: catSupp.id },
    { ref: 'SUP-004', nom: 'Supplément Poisson', prix: 3500, cat: catSupp.id },
    // Special weekend
    { ref: 'SPW-001', nom: 'Bouillon de boeuf', prix: 2000, cat: catSpecial.id },
    { ref: 'SPW-002', nom: 'Taro sauce jaune', prix: 2500, cat: catSpecial.id },
    // Dejeuner & Diner
    { ref: 'DJD-001', nom: 'Tripes sautées à l\'ail', prix: 2500, cat: catDejDin.id },
    { ref: 'DJD-002', nom: 'Riz cantonais poulet grillé', prix: 2500, cat: catDejDin.id },
    { ref: 'DJD-003', nom: 'Poulet basquaise', prix: 2500, cat: catDejDin.id },
    { ref: 'DJD-004', nom: 'Poulet DG (1/4, 1/2, 1)', prix: 5000, cat: catDejDin.id },
    { ref: 'DJD-005', nom: 'Rôti de poulet', prix: 2500, cat: catDejDin.id },
    { ref: 'DJD-006', nom: 'Rôti de porc', prix: 3000, cat: catDejDin.id },
    { ref: 'DJD-007', nom: 'Poisson bar', prix: 5000, cat: catDejDin.id },
    { ref: 'DJD-008', nom: 'Haricot blanc', prix: 2500, cat: catDejDin.id },
    { ref: 'DJD-009', nom: 'Escargot', prix: 3000, cat: catDejDin.id },
  ];

  // ========== PRODUITS BOISSONS ==========
  const produitsBoissons = [
    // Vins blancs
    { ref: 'VBL-001', nom: 'Vieux Moulin (blanc)', prix: 5000, cat: catVinsBlancs.id },
    { ref: 'VBL-002', nom: 'Isabelle de France', prix: 7000, cat: catVinsBlancs.id },
    { ref: 'VBL-003', nom: 'Domaine', prix: 7000, cat: catVinsBlancs.id },
    { ref: 'VBL-004', nom: 'Louis Eschenouer (blanc)', prix: 10000, cat: catVinsBlancs.id },
    { ref: 'VBL-005', nom: 'Carillonades', prix: 10000, cat: catVinsBlancs.id },
    // Vins rouges
    { ref: 'VRG-001', nom: 'Vieux Moulin (rouge)', prix: 5500, cat: catVinsRouges.id },
    { ref: 'VRG-002', nom: 'Paul Arras Bordeaux', prix: 7000, cat: catVinsRouges.id },
    { ref: 'VRG-003', nom: 'Paul Arras Merlot', prix: 7500, cat: catVinsRouges.id },
    { ref: 'VRG-004', nom: 'Calvet', prix: 10000, cat: catVinsRouges.id },
    { ref: 'VRG-005', nom: 'Louis Eschenouer (rouge)', prix: 10000, cat: catVinsRouges.id },
    { ref: 'VRG-006', nom: 'Ballart de guest', prix: 10000, cat: catVinsRouges.id },
    { ref: 'VRG-007', nom: 'Roche Mazet', prix: 10000, cat: catVinsRouges.id },
    { ref: 'VRG-008', nom: 'Asconic Agor', prix: 12000, cat: catVinsRouges.id },
    { ref: 'VRG-009', nom: 'Château Saint Germain', prix: 12000, cat: catVinsRouges.id },
    { ref: 'VRG-010', nom: 'Calvet Grand Reserve', prix: 15000, cat: catVinsRouges.id },
    { ref: 'VRG-011', nom: 'Château Barreyres', prix: 15000, cat: catVinsRouges.id },
    // Vins roses
    { ref: 'VRS-001', nom: 'Sandala', prix: 10000, cat: catVinsRoses.id },
    { ref: 'VRS-002', nom: 'Robertson', prix: 10000, cat: catVinsRoses.id },
    { ref: 'VRS-003', nom: 'JP Chenet (rosé)', prix: 10000, cat: catVinsRoses.id },
    { ref: 'VRS-004', nom: 'Moscato (rosé)', prix: 10000, cat: catVinsRoses.id },
    { ref: 'VRS-005', nom: 'Moscato (rosé premium)', prix: 15000, cat: catVinsRoses.id },
    // Vins mousseux
    { ref: 'VMX-001', nom: 'JP Chenet (mousseux)', prix: 15000, cat: catVinsMousseux.id },
    { ref: 'VMX-002', nom: 'Moscato (mousseux)', prix: 15000, cat: catVinsMousseux.id },
    // Bieres
    { ref: 'BIR-001', nom: 'Ice black', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-002', nom: 'Bullet', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-003', nom: 'Chill', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-004', nom: 'Ice 4x', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-005', nom: 'Kadj', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-006', nom: 'Booster cola', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-007', nom: 'Castel', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-008', nom: 'Dopple', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-009', nom: 'Harp', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-010', nom: 'Ice peanapple', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-011', nom: 'Beaufort', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-012', nom: 'Booster gin tonic', prix: 1000, cat: catBieres.id },
    { ref: 'BIR-013', nom: 'Tonic', prix: 1000, cat: catBieres.id },
    // Cocktails alcoolises
    { ref: 'CKA-001', nom: 'Black russian', prix: 3500, cat: catCocktailAlcool.id },
    { ref: 'CKA-002', nom: 'Sex on the beach', prix: 3500, cat: catCocktailAlcool.id },
    { ref: 'CKA-003', nom: 'Mojito', prix: 3500, cat: catCocktailAlcool.id },
    { ref: 'CKA-004', nom: 'Blue lagoon', prix: 3500, cat: catCocktailAlcool.id },
    { ref: 'CKA-005', nom: 'Martini cocktail', prix: 3500, cat: catCocktailAlcool.id },
    // Cocktails sans alcool
    { ref: 'CKS-001', nom: 'Virginie Mojito', prix: 3500, cat: catCocktailSans.id },
    { ref: 'CKS-002', nom: 'Cinderella Mocktail', prix: 3500, cat: catCocktailSans.id },
    // Champagne
    { ref: 'CHP-001', nom: 'Moet Brut', prix: 55000, cat: catChampagne.id },
    { ref: 'CHP-002', nom: 'Veuve Clicquot', prix: 70000, cat: catChampagne.id },
    { ref: 'CHP-003', nom: 'Moet Nectar', prix: 70000, cat: catChampagne.id },
    { ref: 'CHP-004', nom: 'Moet Ice', prix: 80000, cat: catChampagne.id },
    { ref: 'CHP-005', nom: 'Ruinart Blanc', prix: 90000, cat: catChampagne.id },
    { ref: 'CHP-006', nom: 'Dom Pérignon', prix: 100000, cat: catChampagne.id },
    // Boissons sans alcool
    { ref: 'BSA-001', nom: 'Eau minérale (50cl)', prix: 500, cat: catSansAlcool.id },
    { ref: 'BSA-002', nom: 'Eau minérale (1,5L)', prix: 1000, cat: catSansAlcool.id },
    { ref: 'BSA-003', nom: 'Jus de fruits (Bissap, Ananas, Orange)', prix: 1500, cat: catSansAlcool.id },
    { ref: 'BSA-004', nom: 'Soda (Coca, Fanta, Sprite)', prix: 1500, cat: catSansAlcool.id },
    { ref: 'BSA-005', nom: 'Schweppes Tonic / Ginger', prix: 1500, cat: catSansAlcool.id },
    { ref: 'BSA-006', nom: 'Red Bull', prix: 1500, cat: catSansAlcool.id },
    // Boissons alcoolisees
    { ref: 'BAL-001', nom: 'Castel Beer', prix: 1000, cat: catBoissonsAlcool.id },
    { ref: 'BAL-002', nom: 'Guinness', prix: 1000, cat: catBoissonsAlcool.id },
    { ref: 'BAL-003', nom: 'Heineken', prix: 1500, cat: catBoissonsAlcool.id },
    { ref: 'BAL-004', nom: 'Smirnoff Ice', prix: 1500, cat: catBoissonsAlcool.id },
    { ref: 'BAL-005', nom: 'Whisky (Dose)', prix: 2000, cat: catBoissonsAlcool.id },
    // Spiritueux & Liqueurs
    { ref: 'SPR-001', nom: 'Absolut Vodka', prix: 20000, cat: catSpiritueux.id },
    { ref: 'SPR-002', nom: 'Martini Blanc', prix: 20000, cat: catSpiritueux.id },
    { ref: 'SPR-003', nom: 'Jack Daniel\'s', prix: 30000, cat: catSpiritueux.id },
    { ref: 'SPR-004', nom: 'Chivas 12 ans', prix: 35000, cat: catSpiritueux.id },
    { ref: 'SPR-005', nom: 'Jack Daniel\'s Honey', prix: 35000, cat: catSpiritueux.id },
    { ref: 'SPR-006', nom: 'Black Label 12 ans', prix: 40000, cat: catSpiritueux.id },
    { ref: 'SPR-007', nom: 'Singleton 12 ans', prix: 40000, cat: catSpiritueux.id },
    { ref: 'SPR-008', nom: 'Monkey Shoulder', prix: 40000, cat: catSpiritueux.id },
    { ref: 'SPR-009', nom: 'Hennessy VSOP', prix: 40000, cat: catSpiritueux.id },
    { ref: 'SPR-010', nom: 'Glenfiddich 12 ans', prix: 50000, cat: catSpiritueux.id },
    { ref: 'SPR-011', nom: 'Gold Label 15 ans', prix: 70000, cat: catSpiritueux.id },
    { ref: 'SPR-012', nom: 'Glenfiddich 18 ans', prix: 70000, cat: catSpiritueux.id },
    { ref: 'SPR-013', nom: 'Chivas 18 ans', prix: 80000, cat: catSpiritueux.id },
    { ref: 'SPR-014', nom: 'Hennessy VSOP (bouteille)', prix: 80000, cat: catSpiritueux.id },
  ];

  // Insert all products
  const allProduits = [
    ...produitsRestaurant.map((p) => ({ ...p, unite: 'portion' })),
    ...produitsBoissons.map((p) => ({ ...p, unite: 'bouteille' })),
  ];

  for (const p of allProduits) {
    await prisma.produit.create({
      data: {
        reference: p.ref,
        nom: p.nom,
        prixAchat: 0,
        prixVente: p.prix,
        stockActuel: 100,
        seuilAlerte: 10,
        unite: p.unite,
        categorieId: p.cat,
      },
    });
  }

  console.log('Seed OK — admin@residence.local / admin123');
  console.log(`  18 chambres créées`);
  console.log(`  ${produitsRestaurant.length} produits restaurant (6 catégories)`);
  console.log(`  ${produitsBoissons.length} boissons (11 catégories)`);
  console.log(`  1 type de salle de fête`);
  console.log(`  2 caisses (Hotel + Restaurant/Bar)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
