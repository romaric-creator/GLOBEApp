-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('LOGIN', 'LOGOUT', 'ECHEC', 'REFRESH');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT', 'INVENTAIRE');

-- CreateEnum
CREATE TYPE "StatutBonCommande" AS ENUM ('BROUILLON', 'ENVOYE', 'RECU', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PARTICULIER', 'PROFESSIONNEL');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'STAGE', 'FREELANCE');

-- CreateEnum
CREATE TYPE "DoigtEmpreinte" AS ENUM ('POUCE_DROIT', 'INDEX_DROIT', 'MAJEUR_DROIT', 'POUCE_GAUCHE', 'INDEX_GAUCHE');

-- CreateEnum
CREATE TYPE "MethodePointage" AS ENUM ('BIOMETRIQUE', 'MANUEL');

-- CreateEnum
CREATE TYPE "TypeConge" AS ENUM ('ANNUEL', 'MALADIE', 'SANS_SOLDE', 'MATERNITE', 'EXCEPTIONNEL');

-- CreateEnum
CREATE TYPE "StatutConge" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REFUSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeCompte" AS ENUM ('ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT');

-- CreateEnum
CREATE TYPE "TypeCategorieCompta" AS ENUM ('RECETTE', 'DEPENSE', 'TRANSFERT');

-- CreateEnum
CREATE TYPE "TypeSauvegarde" AS ENUM ('COMPLETE', 'INCREMENTALE');

-- CreateEnum
CREATE TYPE "StatutSauvegarde" AS ENUM ('EN_COURS', 'REUSSIE', 'ECHOUEE');

-- CreateEnum
CREATE TYPE "TypeChambre" AS ENUM ('SIMPLE', 'DOUBLE', 'SUITE', 'VIP');

-- CreateEnum
CREATE TYPE "StatutChambre" AS ENUM ('DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'RESERVEE');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_PREPARATION', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeTicketPiscine" AS ENUM ('JOURNALIER', 'ABONNEMENT_MENSUEL', 'ABONNEMENT_ANNUEL');

-- CreateEnum
CREATE TYPE "TypeAccessoire" AS ENUM ('VENTE', 'LOCATION', 'VENTE_ET_LOCATION');

-- CreateEnum
CREATE TYPE "TypeTransactionAccessoire" AS ENUM ('VENTE', 'LOCATION', 'RETOUR');

-- CreateEnum
CREATE TYPE "StatutReservationSalle" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'ANNULEE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "StatutSync" AS ENUM ('EN_COURS', 'REUSSIE', 'ECHOUEE');

-- CreateEnum
CREATE TYPE "TypeCaisse" AS ENUM ('HOTEL', 'RESTAURANT_BAR');

-- CreateEnum
CREATE TYPE "StatutSessionCaisse" AS ENUM ('OUVERTE', 'FERMEE');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY', 'AUTRE');

-- CreateEnum
CREATE TYPE "SourcePaiement" AS ENUM ('HOTEL_INVOICE', 'RESTAURANT_ORDER', 'SERVICE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'ENCAISSE', 'REMBOURSE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "tentativesEchouees" INTEGER NOT NULL DEFAULT 0,
    "dernierLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_connexion" (
    "id" UUID NOT NULL,
    "action" "LogAction" NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "logs_connexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "parentId" UUID,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prixAchat" DECIMAL(10,2) NOT NULL,
    "prixVente" DECIMAL(10,2) NOT NULL,
    "stockActuel" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 5,
    "unite" TEXT NOT NULL DEFAULT 'unite',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categorieId" UUID NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" UUID NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produitId" UUID NOT NULL,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutBonCommande" NOT NULL DEFAULT 'BROUILLON',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fournisseurId" UUID NOT NULL,

    CONSTRAINT "bons_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_bon_commande" (
    "id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "bonCommandeId" UUID NOT NULL,
    "produitId" UUID NOT NULL,

    CONSTRAINT "lignes_bon_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "type" "TypeClient" NOT NULL DEFAULT 'PARTICULIER',
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "raisonSociale" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "pieceIdentite" TEXT,
    "observations" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employes" (
    "id" UUID NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "salaire" DECIMAL(10,2) NOT NULL,
    "typeContrat" "TypeContrat" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreintes" (
    "id" UUID NOT NULL,
    "templateData" BYTEA NOT NULL,
    "doigt" "DoigtEmpreinte" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeId" UUID NOT NULL,

    CONSTRAINT "empreintes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pointages" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "heureArrivee" TIME,
    "heureDepart" TIME,
    "methode" "MethodePointage" NOT NULL DEFAULT 'BIOMETRIQUE',
    "employeId" UUID NOT NULL,

    CONSTRAINT "pointages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conges" (
    "id" UUID NOT NULL,
    "type" "TypeConge" NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "statut" "StatutConge" NOT NULL DEFAULT 'EN_ATTENTE',
    "motif" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeId" UUID NOT NULL,

    CONSTRAINT "conges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comptes" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeCompte" NOT NULL,
    "solde" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "comptes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecritures" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(12,2) NOT NULL,
    "libelle" TEXT NOT NULL,
    "compteDebitId" UUID NOT NULL,
    "compteCreditId" UUID NOT NULL,
    "categorieComptaId" UUID NOT NULL,

    CONSTRAINT "ecritures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories_compta" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeCategorieCompta" NOT NULL,

    CONSTRAINT "categories_compta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clotures" (
    "id" UUID NOT NULL,
    "periode" TEXT NOT NULL,
    "dateCloture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valide" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clotures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sauvegardes" (
    "id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taille" BIGINT,
    "chemin" TEXT NOT NULL,
    "type" "TypeSauvegarde" NOT NULL,
    "statut" "StatutSauvegarde" NOT NULL DEFAULT 'EN_COURS',

    CONSTRAINT "sauvegardes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chambres" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeChambre" NOT NULL,
    "statut" "StatutChambre" NOT NULL DEFAULT 'DISPONIBLE',
    "prixNuit" DECIMAL(10,2) NOT NULL,
    "etage" INTEGER,
    "capacite" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chambres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "dateArrivee" DATE NOT NULL,
    "dateDepart" DATE NOT NULL,
    "nbPersonnes" INTEGER NOT NULL DEFAULT 1,
    "statut" "StatutReservation" NOT NULL DEFAULT 'EN_ATTENTE',
    "montantTotal" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chambreId" UUID NOT NULL,
    "clientId" UUID NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures_sejour" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "montantNuitee" DECIMAL(10,2) NOT NULL,
    "montantExtras" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "montantPaye" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reste" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservationId" UUID NOT NULL,

    CONSTRAINT "factures_sejour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_table" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "tableReference" TEXT,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_PREPARATION',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "serveurId" UUID NOT NULL,

    CONSTRAINT "commandes_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande" (
    "id" UUID NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "commandeId" UUID NOT NULL,
    "produitId" UUID NOT NULL,

    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_piscine" (
    "id" UUID NOT NULL,
    "type" "TypeTicketPiscine" NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" UUID,

    CONSTRAINT "tickets_piscine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements_loisir" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" UUID NOT NULL,

    CONSTRAINT "abonnements_loisir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessoires_piscine" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeAccessoire" NOT NULL DEFAULT 'VENTE',
    "prixVente" DECIMAL(10,2),
    "prixLocation" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessoires_piscine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions_accessoire" (
    "id" UUID NOT NULL,
    "type" "TypeTransactionAccessoire" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnit" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessoireId" UUID NOT NULL,
    "clientId" UUID,

    CONSTRAINT "transactions_accessoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_reservation_salle" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "inclusions" TEXT,
    "prixBase" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "types_reservation_salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations_salle" (
    "id" UUID NOT NULL,
    "dateEvent" DATE NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "nbInvites" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "statut" "StatutReservationSalle" NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" UUID NOT NULL,
    "typeId" UUID,

    CONSTRAINT "reservations_salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL,
    "statut" "StatutSync" NOT NULL,
    "details" TEXT,
    "nbEnvois" INTEGER NOT NULL DEFAULT 0,
    "nbRecus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caisses" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeCaisse" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "caisses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions_caisse" (
    "id" UUID NOT NULL,
    "fondInitial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalTheorique" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalReel" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ecart" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "statut" "StatutSessionCaisse" NOT NULL DEFAULT 'OUVERTE',
    "ouvertureAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fermetureAt" TIMESTAMP(3),
    "notes" TEXT,
    "caisseId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "sessions_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "moyen" "MoyenPaiement" NOT NULL DEFAULT 'ESPECES',
    "sourceType" "SourcePaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'ENCAISSE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "factureSejourId" UUID,
    "commandeTableId" UUID,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nom_key" ON "roles"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "produits_reference_key" ON "produits"("reference");

-- CreateIndex
CREATE INDEX "produits_categorieId_idx" ON "produits"("categorieId");

-- CreateIndex
CREATE INDEX "produits_actif_idx" ON "produits"("actif");

-- CreateIndex
CREATE INDEX "mouvements_stock_produitId_idx" ON "mouvements_stock"("produitId");

-- CreateIndex
CREATE INDEX "mouvements_stock_date_idx" ON "mouvements_stock"("date");

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_numero_key" ON "bons_commande"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "employes_matricule_key" ON "employes"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "employes_userId_key" ON "employes"("userId");

-- CreateIndex
CREATE INDEX "pointages_employeId_idx" ON "pointages"("employeId");

-- CreateIndex
CREATE INDEX "pointages_date_idx" ON "pointages"("date");

-- CreateIndex
CREATE INDEX "ecritures_date_idx" ON "ecritures"("date");

-- CreateIndex
CREATE INDEX "ecritures_compteDebitId_idx" ON "ecritures"("compteDebitId");

-- CreateIndex
CREATE INDEX "ecritures_compteCreditId_idx" ON "ecritures"("compteCreditId");

-- CreateIndex
CREATE UNIQUE INDEX "chambres_numero_key" ON "chambres"("numero");

-- CreateIndex
CREATE INDEX "reservations_chambreId_idx" ON "reservations"("chambreId");

-- CreateIndex
CREATE INDEX "reservations_clientId_idx" ON "reservations"("clientId");

-- CreateIndex
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "factures_sejour_numero_key" ON "factures_sejour"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "factures_sejour_reservationId_key" ON "factures_sejour"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_table_numero_key" ON "commandes_table"("numero");

-- CreateIndex
CREATE INDEX "commandes_table_statut_idx" ON "commandes_table"("statut");

-- CreateIndex
CREATE INDEX "commandes_table_createdAt_idx" ON "commandes_table"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "types_reservation_salle_nom_key" ON "types_reservation_salle"("nom");

-- CreateIndex
CREATE INDEX "sessions_caisse_caisseId_idx" ON "sessions_caisse"("caisseId");

-- CreateIndex
CREATE INDEX "sessions_caisse_statut_idx" ON "sessions_caisse"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_reference_key" ON "paiements"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_factureSejourId_key" ON "paiements"("factureSejourId");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_commandeTableId_key" ON "paiements"("commandeTableId");

-- CreateIndex
CREATE INDEX "paiements_sessionId_idx" ON "paiements"("sessionId");

-- CreateIndex
CREATE INDEX "paiements_sourceType_idx" ON "paiements"("sourceType");

-- CreateIndex
CREATE INDEX "paiements_createdAt_idx" ON "paiements"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_connexion" ADD CONSTRAINT "logs_connexion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_bon_commande" ADD CONSTRAINT "lignes_bon_commande_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "bons_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_bon_commande" ADD CONSTRAINT "lignes_bon_commande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreintes" ADD CONSTRAINT "empreintes_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conges" ADD CONSTRAINT "conges_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_compteDebitId_fkey" FOREIGN KEY ("compteDebitId") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_compteCreditId_fkey" FOREIGN KEY ("compteCreditId") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_categorieComptaId_fkey" FOREIGN KEY ("categorieComptaId") REFERENCES "categories_compta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_sejour" ADD CONSTRAINT "factures_sejour_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_table" ADD CONSTRAINT "commandes_table_serveurId_fkey" FOREIGN KEY ("serveurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes_table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_piscine" ADD CONSTRAINT "tickets_piscine_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements_loisir" ADD CONSTRAINT "abonnements_loisir_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions_accessoire" ADD CONSTRAINT "transactions_accessoire_accessoireId_fkey" FOREIGN KEY ("accessoireId") REFERENCES "accessoires_piscine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions_accessoire" ADD CONSTRAINT "transactions_accessoire_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations_salle" ADD CONSTRAINT "reservations_salle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations_salle" ADD CONSTRAINT "reservations_salle_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "types_reservation_salle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions_caisse" ADD CONSTRAINT "sessions_caisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions_caisse" ADD CONSTRAINT "sessions_caisse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions_caisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_factureSejourId_fkey" FOREIGN KEY ("factureSejourId") REFERENCES "factures_sejour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commandeTableId_fkey" FOREIGN KEY ("commandeTableId") REFERENCES "commandes_table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

