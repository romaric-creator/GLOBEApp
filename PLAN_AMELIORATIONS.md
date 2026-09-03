# Plan d'améliorations — GLOBE Manager

Basé sur l'analyse du code (août 2026). Les phases sont ordonnées par criticité.

---

## Phase 1 — Corrections de bugs critiques

Ces bugs produisent des informations fausses ou silencieusement ignorent des erreurs.

### 1.1 CA Caisse Hôtel hardcodé à 0 dans le dashboard
**Fichier :** `frontend/src/pages/dashboard/DashboardPage.tsx`
**Problème :** La tuile "Caisse Hôtel" dans la vue Caissier affiche `value={0}` en dur. La caisse restaurant charge bien ses stats (`restoStats?.caJour`) mais pas la caisse hôtel.
**Correction :** Appeler `caisseApi.getStats` ou `rapportsApi` pour l'hôtel et connecter la valeur réelle.

### 1.2 Mutations sans `onError` sur les réservations
**Fichier :** `frontend/src/pages/hotel/ReservationsTab.tsx`
**Problème :** Les mutations `confirmer`, `annuler`, `checkIn`, `checkOut` n'ont pas de `onError`. En cas de rejet backend, aucun message n'est affiché à l'utilisateur.
**Correction :** Ajouter `onError: (err) => message.error(getErrorMessage(err))` sur les 4 mutations.

### 1.3 Mouvements de caisse non invalidés après encaissement
**Fichiers :** `frontend/src/pages/caisse-hotel/CaisseHotelPage.tsx`, `frontend/src/pages/caisse-restaurant/CaisseRestaurantPage.tsx`
**Problème :** Après un encaissement ou un mouvement, `queryClient.invalidateQueries` n'invalide pas la clé `['mouvements-caisse', session.id]` / `['mouvements-resto', session.id]`. La liste des mouvements reste désynchronisée jusqu'au prochain rechargement manuel.
**Correction :** Ajouter l'invalidation des mouvements dans les `onSuccess` concernés.

---

## Phase 2 — Corrections UX importantes

Ces problèmes dégradent l'expérience sans bloquer le fonctionnement.

### 2.1 Aucun feedback si aucune chambre disponible
**Fichier :** `frontend/src/pages/hotel/ReservationsTab.tsx`
**Problème :** Si toutes les chambres sont occupées ou en maintenance, le select du formulaire "Nouvelle réservation" est vide sans explication.
**Correction :** Afficher un `Empty` avec message "Aucune chambre disponible" si la liste est vide.

### 2.2 Capacité chambre non corrélée au formulaire
**Fichier :** `frontend/src/pages/hotel/ReservationsTab.tsx`
**Problème :** Le champ "Nombre de personnes" est limité par `maxPersonnes` (état initialisé à 10). Si l'utilisateur n'a pas encore sélectionné de chambre, la limite est 10 par défaut, sans lien avec la vraie `capacite` de la chambre choisie.
**Correction :** Initialiser `maxPersonnes` à partir de la chambre sélectionnée dès l'ouverture du modal si une chambre est déjà sélectionnée, et mettre à jour dynamiquement au `onChange` du select chambre.

### 2.3 Ticket de clôture de caisse absent
**Fichiers :** `frontend/src/pages/caisse-hotel/CaisseHotelPage.tsx`, `frontend/src/pages/caisse-restaurant/CaisseRestaurantPage.tsx`
**Problème :** La clôture de caisse ne génère aucun document imprimable alors que les encaissements et réservations ont leurs tickets.
**Correction :**
- Côté backend : ajouter un endpoint `GET /caisse/sessions/:id/ticket` retournant un PDF de clôture (fond initial, total théorique, total réel, écart, liste des mouvements).
- Côté frontend : ajouter un bouton "Imprimer rapport de clôture" après la clôture réussie.

### 2.4 Alerte biométrique permanente
**Fichier :** `frontend/src/pages/personnel/PointagesTab.tsx`
**Problème :** L'alerte "Pointage biométrique en cours de construction" s'affiche à chaque visite, ce qui donne une impression d'application cassée.
**Correction :** Rendre l'alerte `closable` avec `closeIcon` et persistance locale (`localStorage`) pour ne plus la réafficher une fois fermée.

### 2.5 Restriction de rôles pour Piscine et Salle de fête
**Fichier :** `frontend/src/components/layout/AppLayout.tsx`
**Problème :** Les menus `/piscine` et `/salle-fete` sont visibles et accessibles pour tous les rôles, y compris les serveurs et caissiers.
**Correction :** Définir les rôles autorisés pour ces deux items (ex : `['admin', 'manager', 'employe']`) et appliquer le filtre existant.

### 2.6 Redirection silencieuse sur accès refusé
**Fichier :** `frontend/src/components/ProtectedRoute.tsx`
**Problème :** Un utilisateur qui tente d'accéder à `/comptabilite` via l'URL est redirigé vers `/dashboard` sans aucun message explicatif.
**Correction :** Afficher une page ou une notification "Accès non autorisé" avant la redirection.

---

## Phase 3 — Fonctionnalités manquantes (dans le schéma, absentes du code)

### 3.1 Fiche de police client
**Fichiers :** `frontend/src/pages/clients/ClientsPage.tsx`, `frontend/src/pages/hotel/ReservationsTab.tsx`
**Problème :** Les champs légaux `typeDocument`, `numeroDocument`, `nationalite`, `paysProvenance`, `dateNaissance` sont dans le modèle `Client` et `Reservation` en base de données mais aucun formulaire frontend ne les expose.
**Correction :**
- Ajouter une section "Informations légales" (collapsible) dans le formulaire client.
- Ajouter les champs légaux dans le formulaire de réservation (pré-remplissage depuis la fiche client si disponible).
- S'assurer que le backend `clients.service.ts` accepte et retourne ces champs.

### 3.2 Fournisseurs & Bons de commande
**Problème :** Le schéma Prisma a `Fournisseur`, `BonCommande`, `LigneBonCommande` mais il n'existe ni service backend, ni controller, ni page frontend.
**Correction — Backend :**
- Créer `produits.service.ts` — méthodes : `getFournisseurs`, `createFournisseur`, `updateFournisseur`, `getBonsCommande`, `createBonCommande`, `updateStatutBon`, `recevoirBon` (qui met à jour le stock via `MouvementStock`).
- Ajouter les endpoints dans `produits.controller.ts`.

**Correction — Frontend :**
- Ajouter un onglet "Fournisseurs" dans `ProduitsPage` (CRUD fournisseurs).
- Ajouter un onglet "Bons de commande" dans `ProduitsPage` (création, suivi statut BROUILLON → ENVOYÉ → REÇU, réception auto-incrémentant le stock).

---

## Phase 4 — Rapports et export

### 4.1 Export des rapports (PDF / Excel)
**Fichier :** `frontend/src/pages/rapports/RapportsPage.tsx`
**Problème :** Aucune librairie d'export n'est installée, aucun bouton d'export n'existe.
**Correction :**
- Installer `xlsx` pour l'export Excel.
- Ajouter un bouton "Exporter Excel" sur chaque tableau de rapport.
- Pour le PDF : utiliser le même mécanisme que les tickets (endpoint backend retournant un PDF).

### 4.2 Rapports manquants
**Fichier :** `backend/src/modules/rapports/rapports.service.ts`
**Problème :** Pas de rapport Piscine, Salle de fête, Stock/Inventaire ni Personnel détaillé (heures travaillées, congés consommés).
**Correction :**
- Ajouter les endpoints backend correspondants.
- Ajouter des onglets dans `RapportsPage` : "Piscine", "Salle de fête", "Stock", "Personnel".

---

## Phase 5 — Comptabilité complète

### 5.1 Plan de comptes et écritures comptables
**Fichier :** `backend/src/modules/comptabilite/`
**Problème :** Le backend n'expose aucun endpoint pour gérer les `Compte` ou les `Ecriture`. La comptabilité se limite aux dépenses et au tableau de bord agrégé. Pas de journal, pas de bilan.
**Correction — Backend :**
- Ajouter les endpoints : `GET/POST /comptabilite/comptes`, `GET /comptabilite/journal`, `POST /comptabilite/ecritures`.

**Correction — Frontend :**
- Ajouter des onglets dans `ComptabilitePage` : "Plan de comptes", "Journal des écritures".

---

## Récapitulatif des phases

| Phase | Contenu | Fichiers touchés | Effort estimé |
|-------|---------|-----------------|---------------|
| 1 | 3 bugs critiques | 3 fichiers frontend | Faible |
| 2 | 6 corrections UX | 5 fichiers frontend + 1 backend | Moyen |
| 3 | Fiche de police + Fournisseurs | 3 frontend + 3 backend | Élevé |
| 4 | Export + rapports manquants | 2 frontend + 1 backend | Moyen |
| 5 | Comptabilité complète | 2 frontend + 1 backend | Élevé |
