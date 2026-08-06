-- CreateIndex
CREATE INDEX "produits_categorieId_idx" ON "produits"("categorieId");
CREATE INDEX "produits_actif_idx" ON "produits"("actif");
CREATE INDEX "mouvements_stock_produitId_idx" ON "mouvements_stock"("produitId");
CREATE INDEX "mouvements_stock_date_idx" ON "mouvements_stock"("date");
CREATE INDEX "ventes_userId_idx" ON "ventes"("userId");
CREATE INDEX "ventes_clientId_idx" ON "ventes"("clientId");
CREATE INDEX "ventes_date_idx" ON "ventes"("date");
CREATE INDEX "ventes_statut_idx" ON "ventes"("statut");
CREATE INDEX "lignes_vente_venteId_idx" ON "lignes_vente"("venteId");
CREATE INDEX "lignes_vente_produitId_idx" ON "lignes_vente"("produitId");
CREATE INDEX "creances_clientId_idx" ON "creances"("clientId");
CREATE INDEX "creances_statut_idx" ON "creances"("statut");
CREATE INDEX "reservations_chambreId_idx" ON "reservations"("chambreId");
CREATE INDEX "reservations_clientId_idx" ON "reservations"("clientId");
CREATE INDEX "reservations_statut_idx" ON "reservations"("statut");
CREATE INDEX "commandes_table_tableId_idx" ON "commandes_table"("tableId");
CREATE INDEX "commandes_table_statut_idx" ON "commandes_table"("statut");
CREATE INDEX "commandes_table_createdAt_idx" ON "commandes_table"("createdAt");
CREATE INDEX "pointages_employeId_idx" ON "pointages"("employeId");
CREATE INDEX "pointages_date_idx" ON "pointages"("date");
CREATE INDEX "ecritures_date_idx" ON "ecritures"("date");
CREATE INDEX "ecritures_compteDebitId_idx" ON "ecritures"("compteDebitId");
CREATE INDEX "ecritures_compteCreditId_idx" ON "ecritures"("compteCreditId");

-- DropForeignKey
ALTER TABLE "pointages" DROP CONSTRAINT IF EXISTS "pointages_employeId_fkey";
ALTER TABLE "conges" DROP CONSTRAINT IF EXISTS "conges_employeId_fkey";

-- AddForeignKey
ALTER TABLE "pointages" ADD CONSTRAINT "pointages_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conges" ADD CONSTRAINT "conges_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
