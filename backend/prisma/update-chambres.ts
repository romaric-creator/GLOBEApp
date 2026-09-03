import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const chambres = [
  // Chambre Standard (ventilée)
  { numero: 'C 101', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 102', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 103', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 104', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 105', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 106', type: 'STANDARD', description: 'Standard - ventilée', prixSieste: 3000, prixJournee: 5000, prixNuit: 10000, etage: 1, capacite: 2 },
  // Chambre Junior (climatisée)
  { numero: 'C 108', type: 'JUNIOR', description: 'Junior - climatisée', prixSieste: 5000, prixJournee: 7000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 109', type: 'JUNIOR', description: 'Junior - climatisée', prixSieste: 5000, prixJournee: 7000, prixNuit: 10000, etage: 1, capacite: 2 },
  { numero: 'C 302', type: 'JUNIOR', description: 'Junior - climatisée', prixSieste: 5000, prixJournee: 7000, prixNuit: 10000, etage: 3, capacite: 2 },
  { numero: 'C 303', type: 'JUNIOR', description: 'Junior - climatisée', prixSieste: 5000, prixJournee: 7000, prixNuit: 10000, etage: 3, capacite: 2 },
  // Chambre Junior Plus (spacieux)
  { numero: 'C 107', type: 'JUNIOR_PLUS', description: 'Junior Plus - spacieux', prixSieste: 5000, prixJournee: 8000, prixNuit: 12000, etage: 1, capacite: 2 },
  { numero: 'C 110', type: 'JUNIOR_PLUS', description: 'Junior Plus - spacieux', prixSieste: 5000, prixJournee: 8000, prixNuit: 12000, etage: 1, capacite: 2 },
  { numero: 'C 201', type: 'JUNIOR_PLUS', description: 'Junior Plus - spacieux', prixSieste: 5000, prixJournee: 8000, prixNuit: 12000, etage: 2, capacite: 2 },
  { numero: 'C 202', type: 'JUNIOR_PLUS', description: 'Junior Plus - spacieux', prixSieste: 5000, prixJournee: 8000, prixNuit: 12000, etage: 2, capacite: 2 },
  // Chambre Sénior (meublée)
  { numero: 'C 301', type: 'SENIOR', description: 'Sénior - meublée', prixSieste: 5000, prixJournee: 10000, prixNuit: 13000, etage: 3, capacite: 2 },
  { numero: 'C 305', type: 'SENIOR', description: 'Sénior - meublée', prixSieste: 5000, prixJournee: 10000, prixNuit: 13000, etage: 3, capacite: 2 },
  // Studio Standard (normal)
  { numero: 'S 111', type: 'STUDIO', description: 'Studio Standard - normal', prixSieste: 7000, prixJournee: 10000, prixNuit: 13000, etage: 1, capacite: 2 },
  // Studio Junior (spacieux)
  { numero: 'S 204', type: 'STUDIO', description: 'Studio Junior - spacieux', prixSieste: 7000, prixJournee: 10000, prixNuit: 13000, etage: 2, capacite: 2 },
  { numero: 'S 205', type: 'STUDIO', description: 'Studio Junior - spacieux', prixSieste: 7000, prixJournee: 10000, prixNuit: 13000, etage: 2, capacite: 2 },
  { numero: 'S 304', type: 'STUDIO', description: 'Studio Junior - spacieux', prixSieste: 7000, prixJournee: 10000, prixNuit: 13000, etage: 3, capacite: 2 },
  // Studio Junior Plus (cuisine)
  { numero: 'S 206', type: 'STUDIO', description: 'Studio Junior Plus - cuisine', prixSieste: 7000, prixJournee: 10000, prixNuit: 15000, etage: 2, capacite: 3 },
  // Appartement Normal (complet)
  { numero: 'A 203', type: 'APPARTEMENT', description: 'Appartement - complet', prixSieste: null, prixJournee: 25000, prixNuit: 30000, etage: 2, capacite: 4 },
  { numero: 'A 306', type: 'APPARTEMENT', description: 'Appartement - complet', prixSieste: null, prixJournee: 25000, prixNuit: 30000, etage: 3, capacite: 4 },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const ch of chambres) {
    const existing = await prisma.chambre.findUnique({ where: { numero: ch.numero } });
    if (existing) {
      await prisma.chambre.update({
        where: { numero: ch.numero },
        data: {
          type: ch.type as never,
          description: ch.description,
          prixNuit: ch.prixNuit,
          prixSieste: ch.prixSieste ?? null,
          prixJournee: ch.prixJournee,
          etage: ch.etage,
          capacite: ch.capacite,
        },
      });
      updated++;
    } else {
      await prisma.chambre.create({
        data: {
          numero: ch.numero,
          type: ch.type as never,
          description: ch.description,
          prixNuit: ch.prixNuit,
          prixSieste: ch.prixSieste ?? null,
          prixJournee: ch.prixJournee,
          etage: ch.etage,
          capacite: ch.capacite,
          statut: 'DISPONIBLE',
        },
      });
      created++;
    }
  }

  console.log(`Chambres mises a jour : ${updated} | Creees : ${created}`);

  const all = await prisma.chambre.findMany({ orderBy: { numero: 'asc' }, select: { numero: true, type: true, description: true, prixNuit: true } });
  console.table(all.map(c => ({ numero: c.numero, type: c.type, description: c.description, prixNuit: Number(c.prixNuit) })));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
