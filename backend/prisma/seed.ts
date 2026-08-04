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
  'hotel',
  'restaurant',
  'piscine',
  'livraison',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

async function main() {
  console.log('Seeding database...');

  // ========================
  // Permissions & Roles
  // ========================
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

  const serveurRole = await prisma.role.upsert({
    where: { nom: 'serveur' },
    update: {},
    create: { nom: 'serveur', description: 'Serveur restaurant/bar' },
  });

  const employeRole = await prisma.role.upsert({
    where: { nom: 'employe' },
    update: {},
    create: { nom: 'employe', description: 'Employe standard' },
  });

  // Admin gets all permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Manager permissions
  const managerModules = ['ventes', 'stock', 'clients', 'personnel', 'rapports', 'hotel', 'restaurant', 'piscine', 'livraison'];
  for (const perm of permissions.filter((p) => managerModules.includes(p.module))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // Caissier permissions
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

  // ========================
  // Users
  // ========================
  const passwordHash = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@residence.local' },
    update: {},
    create: {
      email: 'admin@residence.local',
      passwordHash,
      nom: 'Benali',
      prenom: 'Karim',
      telephone: '+213555000001',
      roleId: adminRole.id,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@residence.local' },
    update: {},
    create: {
      email: 'manager@residence.local',
      passwordHash: userPassword,
      nom: 'Khelifi',
      prenom: 'Amina',
      telephone: '+213555000002',
      roleId: managerRole.id,
    },
  });

  const caissierUser = await prisma.user.upsert({
    where: { email: 'caissier@residence.local' },
    update: {},
    create: {
      email: 'caissier@residence.local',
      passwordHash: userPassword,
      nom: 'Boudjema',
      prenom: 'Yacine',
      telephone: '+213555000003',
      roleId: caissierRole.id,
    },
  });

  const serveurUser = await prisma.user.upsert({
    where: { email: 'serveur@residence.local' },
    update: {},
    create: {
      email: 'serveur@residence.local',
      passwordHash: userPassword,
      nom: 'Messaoud',
      prenom: 'Sofiane',
      telephone: '+213555000004',
      roleId: serveurRole.id,
    },
  });

  const employeUser = await prisma.user.upsert({
    where: { email: 'employe@residence.local' },
    update: {},
    create: {
      email: 'employe@residence.local',
      passwordHash: userPassword,
      nom: 'Zerrouki',
      prenom: 'Fatima',
      telephone: '+213555000005',
      roleId: employeRole.id,
    },
  });

  console.log('  Users created');

  // ========================
  // Clients
  // ========================
  const client1 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      type: 'PARTICULIER',
      nom: 'Hamidou',
      prenom: 'Mohamed',
      telephone: '+213661000001',
      email: 'hamidou.m@gmail.com',
      pointsFidelite: 150,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      type: 'PARTICULIER',
      nom: 'Saidi',
      prenom: 'Leila',
      telephone: '+213661000002',
      email: 'leila.saidi@hotmail.com',
      pointsFidelite: 80,
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      type: 'PROFESSIONNEL',
      nom: 'Benmoussa',
      raisonSociale: 'SARL Benmoussa Import',
      telephone: '+213770000001',
      email: 'contact@benmoussa-import.dz',
      pointsFidelite: 320,
    },
  });

  const client4 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      type: 'PARTICULIER',
      nom: 'Aït Meziane',
      prenom: 'Djamila',
      telephone: '+213661000004',
      pointsFidelite: 45,
    },
  });

  const client5 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      type: 'PROFESSIONNEL',
      nom: 'Touati',
      raisonSociale: 'Hotel Touati & Fils',
      telephone: '+213770000002',
      email: 'reservation@touati-hotel.dz',
      pointsFidelite: 500,
    },
  });

  console.log('  Clients created');

  // ========================
  // Categories & Produits
  // ========================
  const catBoissons = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000001', nom: 'Boissons', description: 'Toutes les boissons' },
  });

  const catJus = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000002', nom: 'Jus', description: 'Jus de fruits naturels et industriels', parentId: catBoissons.id },
  });

  const catBieres = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000003' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000003', nom: 'Bieres', description: 'Bieres locales et importees', parentId: catBoissons.id },
  });

  const catWhisky = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000004' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000004', nom: 'Whisky', description: 'Whisky et spiritueux', parentId: catBoissons.id },
  });

  const catVins = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000005' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000005', nom: 'Vins', description: 'Vins rouges, blancs et roses', parentId: catBoissons.id },
  });

  const catCocktails = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000006' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000006', nom: 'Cocktails', description: 'Cocktails maison', parentId: catBoissons.id },
  });

  const catSodas = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000007' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000007', nom: 'Sodas', description: 'Boissons gazeuses', parentId: catBoissons.id },
  });

  const catEau = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000008' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000008', nom: 'Eau', description: 'Eau minerale et gazeuse', parentId: catBoissons.id },
  });

  const catAlimentaire = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000009' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000009', nom: 'Alimentaire', description: 'Produits alimentaires' },
  });

  const catEntretien = await prisma.categorie.upsert({
    where: { id: '00000000-0000-0000-0001-000000000010' },
    update: {},
    create: { id: '00000000-0000-0000-0001-000000000010', nom: 'Entretien', description: 'Produits d\'entretien et menage' },
  });

  console.log('  Categories created');

  // Produits - Jus
  const produits = await Promise.all([
    prisma.produit.upsert({
      where: { reference: 'JUS-001' },
      update: {},
      create: { reference: 'JUS-001', nom: 'Jus d\'orange Rouiba 1L', prixAchat: 120, prixVente: 180, stockActuel: 48, seuilAlerte: 12, unite: 'bouteille', categorieId: catJus.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'JUS-002' },
      update: {},
      create: { reference: 'JUS-002', nom: 'Jus de pomme Rouiba 1L', prixAchat: 120, prixVente: 180, stockActuel: 36, seuilAlerte: 12, unite: 'bouteille', categorieId: catJus.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'JUS-003' },
      update: {},
      create: { reference: 'JUS-003', nom: 'Jus mangue NCA 25cl', prixAchat: 50, prixVente: 100, stockActuel: 60, seuilAlerte: 20, unite: 'bouteille', categorieId: catJus.id },
    }),
    // Bieres
    prisma.produit.upsert({
      where: { reference: 'BIE-001' },
      update: {},
      create: { reference: 'BIE-001', nom: 'Heineken 33cl', prixAchat: 150, prixVente: 300, stockActuel: 72, seuilAlerte: 24, unite: 'bouteille', categorieId: catBieres.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'BIE-002' },
      update: {},
      create: { reference: 'BIE-002', nom: 'Stella Artois 33cl', prixAchat: 140, prixVente: 280, stockActuel: 48, seuilAlerte: 24, unite: 'bouteille', categorieId: catBieres.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'BIE-003' },
      update: {},
      create: { reference: 'BIE-003', nom: 'Tango 50cl', prixAchat: 80, prixVente: 150, stockActuel: 96, seuilAlerte: 30, unite: 'bouteille', categorieId: catBieres.id },
    }),
    // Whisky
    prisma.produit.upsert({
      where: { reference: 'WHI-001' },
      update: {},
      create: { reference: 'WHI-001', nom: 'Johnnie Walker Red Label 70cl', prixAchat: 3500, prixVente: 5000, stockActuel: 8, seuilAlerte: 3, unite: 'bouteille', categorieId: catWhisky.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'WHI-002' },
      update: {},
      create: { reference: 'WHI-002', nom: 'Jack Daniel\'s 70cl', prixAchat: 4000, prixVente: 6000, stockActuel: 5, seuilAlerte: 2, unite: 'bouteille', categorieId: catWhisky.id },
    }),
    // Vins
    prisma.produit.upsert({
      where: { reference: 'VIN-001' },
      update: {},
      create: { reference: 'VIN-001', nom: 'Medea Rouge 75cl', prixAchat: 400, prixVente: 800, stockActuel: 24, seuilAlerte: 6, unite: 'bouteille', categorieId: catVins.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'VIN-002' },
      update: {},
      create: { reference: 'VIN-002', nom: 'Cuvee du President Rose 75cl', prixAchat: 500, prixVente: 900, stockActuel: 18, seuilAlerte: 6, unite: 'bouteille', categorieId: catVins.id },
    }),
    // Sodas
    prisma.produit.upsert({
      where: { reference: 'SOD-001' },
      update: {},
      create: { reference: 'SOD-001', nom: 'Coca-Cola 33cl', prixAchat: 50, prixVente: 100, stockActuel: 120, seuilAlerte: 30, unite: 'canette', categorieId: catSodas.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'SOD-002' },
      update: {},
      create: { reference: 'SOD-002', nom: 'Pepsi 33cl', prixAchat: 45, prixVente: 90, stockActuel: 96, seuilAlerte: 30, unite: 'canette', categorieId: catSodas.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'SOD-003' },
      update: {},
      create: { reference: 'SOD-003', nom: 'Fanta Orange 33cl', prixAchat: 45, prixVente: 90, stockActuel: 60, seuilAlerte: 20, unite: 'canette', categorieId: catSodas.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'SOD-004' },
      update: {},
      create: { reference: 'SOD-004', nom: 'Sprite 1.5L', prixAchat: 100, prixVente: 160, stockActuel: 30, seuilAlerte: 10, unite: 'bouteille', categorieId: catSodas.id },
    }),
    // Eau
    prisma.produit.upsert({
      where: { reference: 'EAU-001' },
      update: {},
      create: { reference: 'EAU-001', nom: 'Ifri 1.5L', prixAchat: 30, prixVente: 60, stockActuel: 200, seuilAlerte: 50, unite: 'bouteille', categorieId: catEau.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'EAU-002' },
      update: {},
      create: { reference: 'EAU-002', nom: 'Saida 50cl', prixAchat: 20, prixVente: 50, stockActuel: 150, seuilAlerte: 40, unite: 'bouteille', categorieId: catEau.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'EAU-003' },
      update: {},
      create: { reference: 'EAU-003', nom: 'Guedila Gazeuse 1L', prixAchat: 40, prixVente: 80, stockActuel: 60, seuilAlerte: 15, unite: 'bouteille', categorieId: catEau.id },
    }),
    // Alimentaire
    prisma.produit.upsert({
      where: { reference: 'ALM-001' },
      update: {},
      create: { reference: 'ALM-001', nom: 'Huile Cevital 5L', prixAchat: 750, prixVente: 950, stockActuel: 15, seuilAlerte: 5, unite: 'bidon', categorieId: catAlimentaire.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'ALM-002' },
      update: {},
      create: { reference: 'ALM-002', nom: 'Sucre 1kg', prixAchat: 90, prixVente: 130, stockActuel: 40, seuilAlerte: 10, unite: 'kg', categorieId: catAlimentaire.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'ALM-003' },
      update: {},
      create: { reference: 'ALM-003', nom: 'Cafe Aigle Noir 250g', prixAchat: 350, prixVente: 500, stockActuel: 25, seuilAlerte: 8, unite: 'paquet', categorieId: catAlimentaire.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'ALM-004' },
      update: {},
      create: { reference: 'ALM-004', nom: 'Lait Candia 1L', prixAchat: 80, prixVente: 120, stockActuel: 3, seuilAlerte: 10, unite: 'brique', categorieId: catAlimentaire.id },
    }),
    // Entretien
    prisma.produit.upsert({
      where: { reference: 'ENT-001' },
      update: {},
      create: { reference: 'ENT-001', nom: 'Javel Isis 1L', prixAchat: 60, prixVente: 100, stockActuel: 30, seuilAlerte: 10, unite: 'bouteille', categorieId: catEntretien.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'ENT-002' },
      update: {},
      create: { reference: 'ENT-002', nom: 'Detergent OMO 3kg', prixAchat: 500, prixVente: 700, stockActuel: 12, seuilAlerte: 5, unite: 'paquet', categorieId: catEntretien.id },
    }),
    prisma.produit.upsert({
      where: { reference: 'ENT-003' },
      update: {},
      create: { reference: 'ENT-003', nom: 'Papier toilette (paquet 12)', prixAchat: 250, prixVente: 380, stockActuel: 2, seuilAlerte: 5, unite: 'paquet', categorieId: catEntretien.id },
    }),
  ]);

  console.log('  Produits created');

  // ========================
  // Mouvements de Stock
  // ========================
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  await prisma.mouvementStock.createMany({
    skipDuplicates: true,
    data: [
      { type: 'ENTREE', quantite: 100, motif: 'Livraison initiale', produitId: produits[0].id, date: daysAgo(30) },
      { type: 'SORTIE', quantite: 52, motif: 'Ventes semaine 1-4', produitId: produits[0].id, date: daysAgo(7) },
      { type: 'ENTREE', quantite: 120, motif: 'Reapprovisionnement bieres', produitId: produits[3].id, date: daysAgo(15) },
      { type: 'SORTIE', quantite: 48, motif: 'Consommation bar', produitId: produits[3].id, date: daysAgo(3) },
      { type: 'ENTREE', quantite: 200, motif: 'Stock initial eau', produitId: produits[14].id, date: daysAgo(20) },
      { type: 'ENTREE', quantite: 50, motif: 'Commande Coca', produitId: produits[10].id, date: daysAgo(10) },
      { type: 'INVENTAIRE', quantite: 120, motif: 'Inventaire mensuel', produitId: produits[10].id, date: daysAgo(2) },
      { type: 'ENTREE', quantite: 20, motif: 'Achat alimentaire', produitId: produits[17].id, date: daysAgo(12) },
      { type: 'SORTIE', quantite: 5, motif: 'Utilisation cuisine', produitId: produits[17].id, date: daysAgo(5) },
      { type: 'AJUSTEMENT', quantite: 3, motif: 'Correction apres comptage (casse)', produitId: produits[20].id, date: daysAgo(1) },
    ],
  });

  console.log('  Mouvements stock created');

  // ========================
  // Employes
  // ========================
  const employe1 = await prisma.employe.upsert({
    where: { matricule: 'EMP-001' },
    update: {},
    create: {
      matricule: 'EMP-001',
      nom: 'Benali',
      prenom: 'Karim',
      poste: 'Directeur General',
      salaire: 150000,
      typeContrat: 'CDI',
      userId: adminUser.id,
    },
  });

  const employe2 = await prisma.employe.upsert({
    where: { matricule: 'EMP-002' },
    update: {},
    create: {
      matricule: 'EMP-002',
      nom: 'Khelifi',
      prenom: 'Amina',
      poste: 'Responsable Operations',
      salaire: 100000,
      typeContrat: 'CDI',
      userId: managerUser.id,
    },
  });

  const employe3 = await prisma.employe.upsert({
    where: { matricule: 'EMP-003' },
    update: {},
    create: {
      matricule: 'EMP-003',
      nom: 'Boudjema',
      prenom: 'Yacine',
      poste: 'Caissier',
      salaire: 45000,
      typeContrat: 'CDI',
      userId: caissierUser.id,
    },
  });

  const employe4 = await prisma.employe.upsert({
    where: { matricule: 'EMP-004' },
    update: {},
    create: {
      matricule: 'EMP-004',
      nom: 'Messaoud',
      prenom: 'Sofiane',
      poste: 'Serveur',
      salaire: 35000,
      typeContrat: 'CDD',
      userId: serveurUser.id,
    },
  });

  const employe5 = await prisma.employe.upsert({
    where: { matricule: 'EMP-005' },
    update: {},
    create: {
      matricule: 'EMP-005',
      nom: 'Zerrouki',
      prenom: 'Fatima',
      poste: 'Femme de menage',
      salaire: 30000,
      typeContrat: 'CDI',
      userId: employeUser.id,
    },
  });

  const employe6 = await prisma.employe.upsert({
    where: { matricule: 'EMP-006' },
    update: {},
    create: {
      matricule: 'EMP-006',
      nom: 'Belkacem',
      prenom: 'Rachid',
      poste: 'Cuisinier',
      salaire: 55000,
      typeContrat: 'CDI',
    },
  });

  const employe7 = await prisma.employe.upsert({
    where: { matricule: 'EMP-007' },
    update: {},
    create: {
      matricule: 'EMP-007',
      nom: 'Hadjadj',
      prenom: 'Nadia',
      poste: 'Receptionniste',
      salaire: 40000,
      typeContrat: 'CDI',
    },
  });

  const employe8 = await prisma.employe.upsert({
    where: { matricule: 'EMP-008' },
    update: {},
    create: {
      matricule: 'EMP-008',
      nom: 'Chikh',
      prenom: 'Omar',
      poste: 'Maitre nageur',
      salaire: 42000,
      typeContrat: 'CDD',
    },
  });

  console.log('  Employes created');

  // ========================
  // Pointages (derniere semaine)
  // ========================
  const pointageEmployes = [employe1, employe2, employe3, employe4, employe5, employe6, employe7, employe8];
  for (let day = 1; day <= 6; day++) {
    const date = daysAgo(day);
    for (const emp of pointageEmployes) {
      if (Math.random() > 0.1) { // 90% presence
        await prisma.pointage.create({
          data: {
            date,
            heureArrivee: new Date(`1970-01-01T0${7 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}:00`),
            heureDepart: new Date(`1970-01-01T${16 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`),
            methode: Math.random() > 0.3 ? 'BIOMETRIQUE' : 'MANUEL',
            employeId: emp.id,
          },
        });
      }
    }
  }

  console.log('  Pointages created');

  // ========================
  // Conges
  // ========================
  await prisma.conge.createMany({
    skipDuplicates: true,
    data: [
      { type: 'ANNUEL', dateDebut: new Date('2026-08-15'), dateFin: new Date('2026-08-30'), statut: 'APPROUVE', employeId: employe5.id },
      { type: 'MALADIE', dateDebut: new Date('2026-07-20'), dateFin: new Date('2026-07-22'), statut: 'APPROUVE', motif: 'Grippe', employeId: employe4.id },
      { type: 'ANNUEL', dateDebut: new Date('2026-09-01'), dateFin: new Date('2026-09-10'), statut: 'EN_ATTENTE', employeId: employe6.id },
      { type: 'EXCEPTIONNEL', dateDebut: new Date('2026-08-10'), dateFin: new Date('2026-08-11'), statut: 'APPROUVE', motif: 'Mariage frere', employeId: employe3.id },
    ],
  });

  console.log('  Conges created');

  // ========================
  // Hotel - Chambres
  // ========================
  const chambres = await Promise.all([
    prisma.chambre.upsert({ where: { numero: '101' }, update: {}, create: { numero: '101', type: 'SIMPLE', prixNuit: 5000, etage: 1, capacite: 1 } }),
    prisma.chambre.upsert({ where: { numero: '102' }, update: {}, create: { numero: '102', type: 'SIMPLE', prixNuit: 5000, etage: 1, capacite: 1 } }),
    prisma.chambre.upsert({ where: { numero: '103' }, update: {}, create: { numero: '103', type: 'DOUBLE', prixNuit: 8000, etage: 1, capacite: 2 } }),
    prisma.chambre.upsert({ where: { numero: '201' }, update: {}, create: { numero: '201', type: 'DOUBLE', prixNuit: 8000, etage: 2, capacite: 2 } }),
    prisma.chambre.upsert({ where: { numero: '202' }, update: {}, create: { numero: '202', type: 'DOUBLE', prixNuit: 9000, etage: 2, capacite: 3 } }),
    prisma.chambre.upsert({ where: { numero: '203' }, update: {}, create: { numero: '203', type: 'SUITE', prixNuit: 15000, etage: 2, capacite: 2, statut: 'OCCUPEE' } }),
    prisma.chambre.upsert({ where: { numero: '301' }, update: {}, create: { numero: '301', type: 'SUITE', prixNuit: 15000, etage: 3, capacite: 2 } }),
    prisma.chambre.upsert({ where: { numero: '302' }, update: {}, create: { numero: '302', type: 'VIP', prixNuit: 25000, etage: 3, capacite: 2 } }),
    prisma.chambre.upsert({ where: { numero: '303' }, update: {}, create: { numero: '303', type: 'VIP', prixNuit: 30000, etage: 3, capacite: 4, statut: 'MAINTENANCE' } }),
  ]);

  console.log('  Chambres created');

  // ========================
  // Reservations
  // ========================
  const reservation1 = await prisma.reservation.create({
    data: {
      dateArrivee: new Date('2026-08-05'),
      dateDepart: new Date('2026-08-08'),
      nbPersonnes: 2,
      statut: 'CONFIRMEE',
      montantTotal: 24000,
      chambreId: chambres[2].id,
      clientId: client1.id,
    },
  });

  const reservation2 = await prisma.reservation.create({
    data: {
      dateArrivee: new Date('2026-08-01'),
      dateDepart: new Date('2026-08-04'),
      nbPersonnes: 2,
      statut: 'EN_COURS',
      montantTotal: 45000,
      notes: 'Client VIP, champagne en chambre',
      chambreId: chambres[5].id,
      clientId: client5.id,
    },
  });

  await prisma.reservation.create({
    data: {
      dateArrivee: new Date('2026-08-10'),
      dateDepart: new Date('2026-08-12'),
      nbPersonnes: 1,
      statut: 'EN_ATTENTE',
      montantTotal: 10000,
      chambreId: chambres[0].id,
      clientId: client2.id,
    },
  });

  await prisma.reservation.create({
    data: {
      dateArrivee: new Date('2026-07-25'),
      dateDepart: new Date('2026-07-28'),
      nbPersonnes: 3,
      statut: 'TERMINEE',
      montantTotal: 27000,
      chambreId: chambres[4].id,
      clientId: client4.id,
    },
  });

  // Facture pour la reservation terminee
  await prisma.factureSejour.create({
    data: {
      numero: 'FS-2026-001',
      montantNuitee: 27000,
      montantExtras: 3500,
      total: 30500,
      payee: true,
      reservationId: reservation2.id,
    },
  });

  console.log('  Reservations & factures created');

  // ========================
  // Restaurant - Tables
  // ========================
  const tables = await Promise.all([
    prisma.tableRestaurant.upsert({ where: { numero: 1 }, update: {}, create: { numero: 1, capacite: 2, zone: 'Terrasse' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 2 }, update: {}, create: { numero: 2, capacite: 2, zone: 'Terrasse' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 3 }, update: {}, create: { numero: 3, capacite: 4, zone: 'Terrasse' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 4 }, update: {}, create: { numero: 4, capacite: 4, zone: 'Interieur' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 5 }, update: {}, create: { numero: 5, capacite: 4, zone: 'Interieur' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 6 }, update: {}, create: { numero: 6, capacite: 6, zone: 'Interieur' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 7 }, update: {}, create: { numero: 7, capacite: 8, zone: 'Salon VIP', statut: 'OCCUPEE' } }),
    prisma.tableRestaurant.upsert({ where: { numero: 8 }, update: {}, create: { numero: 8, capacite: 10, zone: 'Salon VIP' } }),
  ]);

  console.log('  Tables restaurant created');

  // ========================
  // Commandes Restaurant
  // ========================
  const commande1 = await prisma.commandeTable.create({
    data: {
      numero: 'CMD-2026-001',
      statut: 'SERVIE',
      total: 1360,
      tableId: tables[6].id,
      serveurId: serveurUser.id,
      lignes: {
        create: [
          { quantite: 3, prixUnitaire: 300, produitId: produits[3].id },
          { quantite: 2, prixUnitaire: 100, produitId: produits[10].id },
          { quantite: 1, prixUnitaire: 160, produitId: produits[13].id },
        ],
      },
    },
  });

  await prisma.commandeTable.create({
    data: {
      numero: 'CMD-2026-002',
      statut: 'EN_PREPARATION',
      total: 700,
      notes: 'Sans glace pour les bieres',
      tableId: tables[3].id,
      serveurId: serveurUser.id,
      lignes: {
        create: [
          { quantite: 2, prixUnitaire: 150, produitId: produits[5].id },
          { quantite: 4, prixUnitaire: 100, produitId: produits[10].id },
        ],
      },
    },
  });

  console.log('  Commandes restaurant created');

  // ========================
  // Ventes & Caisse
  // ========================
  const vente1 = await prisma.vente.create({
    data: {
      numero: 'VNT-2026-0001',
      sousTotal: 2400,
      remise: 0,
      taxe: 0,
      total: 2400,
      modePaiement: 'ESPECES',
      statut: 'VALIDEE',
      userId: caissierUser.id,
      clientId: client1.id,
      lignes: {
        create: [
          { quantite: 4, prixUnitaire: 300, remise: 0, totalLigne: 1200, produitId: produits[3].id },
          { quantite: 4, prixUnitaire: 180, remise: 0, totalLigne: 720, produitId: produits[0].id },
          { quantite: 3, prixUnitaire: 160, remise: 0, totalLigne: 480, produitId: produits[13].id },
        ],
      },
    },
  });

  const vente2 = await prisma.vente.create({
    data: {
      numero: 'VNT-2026-0002',
      date: daysAgo(2),
      sousTotal: 5000,
      remise: 500,
      taxe: 0,
      total: 4500,
      modePaiement: 'CARTE',
      statut: 'VALIDEE',
      userId: caissierUser.id,
      clientId: client3.id,
      lignes: {
        create: [
          { quantite: 1, prixUnitaire: 5000, remise: 500, totalLigne: 4500, produitId: produits[6].id },
        ],
      },
    },
  });

  const vente3 = await prisma.vente.create({
    data: {
      numero: 'VNT-2026-0003',
      date: daysAgo(1),
      sousTotal: 1250,
      remise: 0,
      taxe: 0,
      total: 1250,
      modePaiement: 'ESPECES',
      statut: 'VALIDEE',
      userId: caissierUser.id,
      lignes: {
        create: [
          { quantite: 5, prixUnitaire: 100, remise: 0, totalLigne: 500, produitId: produits[10].id },
          { quantite: 5, prixUnitaire: 90, remise: 0, totalLigne: 450, produitId: produits[11].id },
          { quantite: 5, prixUnitaire: 60, remise: 0, totalLigne: 300, produitId: produits[14].id },
        ],
      },
    },
  });

  await prisma.vente.create({
    data: {
      numero: 'VNT-2026-0004',
      sousTotal: 800,
      remise: 0,
      taxe: 0,
      total: 800,
      modePaiement: 'CREDIT',
      statut: 'VALIDEE',
      userId: caissierUser.id,
      clientId: client4.id,
      lignes: {
        create: [
          { quantite: 1, prixUnitaire: 800, remise: 0, totalLigne: 800, produitId: produits[8].id },
        ],
      },
    },
  });

  // Ticket pour vente 1
  await prisma.ticket.create({
    data: {
      numeroTicket: 'TKT-2026-0001',
      contenu: 'RESIDENCE GLOBE\n---\nVNT-2026-0001\n4x Heineken 33cl: 1200 FCFA\n4x Jus orange 1L: 720 FCFA\n3x Sprite 1.5L: 480 FCFA\n---\nTOTAL: 2400 FCFA\nPaiement: Especes\nMerci de votre visite!',
      imprime: true,
      venteId: vente1.id,
    },
  });

  console.log('  Ventes created');

  // ========================
  // Creances
  // ========================
  await prisma.creance.create({
    data: {
      montant: 800,
      dateEcheance: new Date('2026-08-15'),
      statut: 'EN_COURS',
      clientId: client4.id,
      venteId: vente3.id,
    },
  });

  console.log('  Creances created');

  // ========================
  // Cloture de caisse
  // ========================
  await prisma.clotureCaisse.create({
    data: {
      date: daysAgo(1),
      montantOuverture: 5000,
      montantCloture: 12150,
      ecart: 0,
      userId: caissierUser.id,
    },
  });

  console.log('  Cloture caisse created');

  // ========================
  // Comptabilite
  // ========================
  const compteCaisse = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000001', nom: 'Caisse', type: 'ACTIF', solde: 87500 },
  });

  const compteBanque = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000002', nom: 'Banque CPA', type: 'ACTIF', solde: 1250000 },
  });

  const compteVentes = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000003' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000003', nom: 'Ventes marchandises', type: 'PRODUIT', solde: 0 },
  });

  const compteChargesPersonnel = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000004' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000004', nom: 'Charges personnel', type: 'CHARGE', solde: 0 },
  });

  const compteAchats = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000005' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000005', nom: 'Achats marchandises', type: 'CHARGE', solde: 0 },
  });

  const compteFournisseurs = await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0002-000000000006' },
    update: {},
    create: { id: '00000000-0000-0000-0002-000000000006', nom: 'Fournisseurs', type: 'PASSIF', solde: 0 },
  });

  // Categories comptables
  const catRecette = await prisma.categorieCompta.upsert({
    where: { id: '00000000-0000-0000-0003-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0003-000000000001', nom: 'Ventes bar/restaurant', type: 'RECETTE' },
  });

  const catDepenseStock = await prisma.categorieCompta.upsert({
    where: { id: '00000000-0000-0000-0003-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0003-000000000002', nom: 'Achat stock', type: 'DEPENSE' },
  });

  const catDepenseSalaires = await prisma.categorieCompta.upsert({
    where: { id: '00000000-0000-0000-0003-000000000003' },
    update: {},
    create: { id: '00000000-0000-0000-0003-000000000003', nom: 'Salaires', type: 'DEPENSE' },
  });

  const catTransfert = await prisma.categorieCompta.upsert({
    where: { id: '00000000-0000-0000-0003-000000000004' },
    update: {},
    create: { id: '00000000-0000-0000-0003-000000000004', nom: 'Transfert interne', type: 'TRANSFERT' },
  });

  // Ecritures comptables
  await prisma.ecriture.createMany({
    skipDuplicates: true,
    data: [
      { date: daysAgo(5), montant: 8950, libelle: 'Ventes journee 30/07', compteDebitId: compteCaisse.id, compteCreditId: compteVentes.id, categorieComptaId: catRecette.id },
      { date: daysAgo(4), montant: 12400, libelle: 'Ventes journee 31/07', compteDebitId: compteCaisse.id, compteCreditId: compteVentes.id, categorieComptaId: catRecette.id },
      { date: daysAgo(3), montant: 45000, libelle: 'Reapprovisionnement boissons', compteDebitId: compteAchats.id, compteCreditId: compteBanque.id, categorieComptaId: catDepenseStock.id },
      { date: daysAgo(2), montant: 497000, libelle: 'Salaires juillet 2026', compteDebitId: compteChargesPersonnel.id, compteCreditId: compteBanque.id, categorieComptaId: catDepenseSalaires.id },
      { date: daysAgo(1), montant: 50000, libelle: 'Versement caisse vers banque', compteDebitId: compteBanque.id, compteCreditId: compteCaisse.id, categorieComptaId: catTransfert.id },
    ],
  });

  console.log('  Comptabilite created');

  // ========================
  // Piscine & Loisirs
  // ========================
  await prisma.ticketPiscine.createMany({
    skipDuplicates: true,
    data: [
      { type: 'JOURNALIER', prix: 500, dateDebut: daysAgo(3), utilise: true, clientId: client1.id },
      { type: 'JOURNALIER', prix: 500, dateDebut: daysAgo(2), utilise: true, clientId: client2.id },
      { type: 'JOURNALIER', prix: 500, dateDebut: daysAgo(1), utilise: false, clientId: client4.id },
      { type: 'ABONNEMENT_MENSUEL', prix: 8000, dateDebut: new Date('2026-08-01'), dateFin: new Date('2026-08-31'), clientId: client1.id },
      { type: 'ABONNEMENT_ANNUEL', prix: 60000, dateDebut: new Date('2026-01-01'), dateFin: new Date('2026-12-31'), clientId: client5.id },
    ],
  });

  await prisma.abonnementLoisir.createMany({
    skipDuplicates: true,
    data: [
      { type: 'Salle de sport', dateDebut: new Date('2026-08-01'), dateFin: new Date('2026-08-31'), prix: 5000, clientId: client1.id },
      { type: 'Sauna + Hammam', dateDebut: new Date('2026-07-15'), dateFin: new Date('2026-08-15'), prix: 3000, clientId: client2.id },
      { type: 'Salle de sport', dateDebut: new Date('2026-06-01'), dateFin: new Date('2026-12-01'), prix: 25000, clientId: client5.id },
    ],
  });

  console.log('  Piscine & loisirs created');

  // ========================
  // Livraison
  // ========================
  const livreur1 = await prisma.livreur.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0004-000000000001', nom: 'Rahmani', prenom: 'Bilal', telephone: '+213555100001', vehicule: 'Moto Honda' },
  });

  const livreur2 = await prisma.livreur.upsert({
    where: { id: '00000000-0000-0000-0004-000000000002' },
    update: {},
    create: { id: '00000000-0000-0000-0004-000000000002', nom: 'Taleb', prenom: 'Amine', telephone: '+213555100002', vehicule: 'Scooter Yamaha' },
  });

  await prisma.livraison.create({
    data: {
      adresse: '12 Rue Didouche Mourad, Alger Centre',
      statut: 'LIVREE',
      fraisLivraison: 300,
      dateLivraison: daysAgo(1),
      livreurId: livreur1.id,
      venteId: vente2.id,
    },
  });

  await prisma.livraison.create({
    data: {
      adresse: '45 Boulevard Mohamed V, Bab El Oued',
      statut: 'EN_COURS',
      fraisLivraison: 400,
      latitude: 36.7905,
      longitude: 3.0576,
      livreurId: livreur2.id,
      venteId: vente3.id,
    },
  });

  console.log('  Livraisons created');

  // ========================
  // Sauvegardes (historique)
  // ========================
  await prisma.sauvegarde.createMany({
    skipDuplicates: true,
    data: [
      { date: daysAgo(7), taille: BigInt(52428800), chemin: '/backups/2026-07-28_complete.sql.gz', type: 'COMPLETE', statut: 'REUSSIE' },
      { date: daysAgo(6), taille: BigInt(5242880), chemin: '/backups/2026-07-29_incr.sql.gz', type: 'INCREMENTALE', statut: 'REUSSIE' },
      { date: daysAgo(5), taille: BigInt(5500000), chemin: '/backups/2026-07-30_incr.sql.gz', type: 'INCREMENTALE', statut: 'REUSSIE' },
      { date: daysAgo(1), taille: BigInt(55000000), chemin: '/backups/2026-08-03_complete.sql.gz', type: 'COMPLETE', statut: 'REUSSIE' },
      { date: daysAgo(0), taille: null, chemin: '/backups/2026-08-04_complete.sql.gz', type: 'COMPLETE', statut: 'EN_COURS' },
    ],
  });

  console.log('  Sauvegardes created');

  // ========================
  // Sync Logs
  // ========================
  await prisma.syncLog.createMany({
    skipDuplicates: true,
    data: [
      { statut: 'REUSSIE', details: 'Sync complete vers cloud', nbEnvois: 1250, nbRecus: 3, createdAt: daysAgo(1) },
      { statut: 'REUSSIE', details: 'Sync incrementale', nbEnvois: 45, nbRecus: 0, createdAt: daysAgo(0) },
      { statut: 'ECHOUEE', details: 'Timeout connexion serveur distant', nbEnvois: 0, nbRecus: 0, createdAt: daysAgo(3) },
    ],
  });

  console.log('  Sync logs created');

  console.log('\nSeed completed successfully!');
  console.log('Comptes disponibles:');
  console.log('  admin@residence.local / admin123 (admin)');
  console.log('  manager@residence.local / password123 (manager)');
  console.log('  caissier@residence.local / password123 (caissier)');
  console.log('  serveur@residence.local / password123 (serveur)');
  console.log('  employe@residence.local / password123 (employe)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
