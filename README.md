# GLOBEApp

Application de gestion commerciale et de comptabilite destinee aux residences, hotels, restaurants, bars et PME.

## Modules

### Modules principaux

| Module | Description |
|--------|-------------|
| Authentification & Securite | Gestion des utilisateurs, roles et permissions |
| Tableau de Bord | KPI, graphiques d'activite, alertes |
| Gestion des Clients | Repertoire clients, creances, historique, fidelite |
| Produits & Stock | Catalogue, categories, mouvements stock, seuils d'alerte, fournisseurs |
| Ventes & Caisse | Enregistrement ventes, facturation, tickets, avoirs, cloture caisse |
| Gestion du Personnel | Fiches employes, contrats, conges, paie |
| Pointage Biometrique | Presence par empreinte digitale |
| Comptabilite | Journal recettes/depenses, tresorerie, bilan, clotures |
| Rapports & Statistiques | Generation de rapports PDF/Excel |
| Sauvegarde & Securite | Backup et restauration des donnees |

### Modules optionnels

| Module | Description |
|--------|-------------|
| Gestion Hotel | Reservations, chambres, facturation sejours |
| Bar & Restauration | Prise de commande sur table, gestion cuisine |
| Piscine & Loisirs | Tickets d'acces, abonnements |
| Livraison | Suivi des livreurs et livraisons |
| Synchronisation Cloud | Sauvegarde automatique distante |

## Stack technique

- **Backend** : NestJS (Node.js / TypeScript)
- **Base de donnees** : PostgreSQL 15
- **Cache** : Redis 7
- **ORM** : Prisma
- **Conteneurisation** : Docker & Docker Compose
- **Authentification** : JWT (Access + Refresh tokens)

## Installation

### Prerequis

- Node.js >= 18
- Docker & Docker Compose
- npm

### Lancement

```bash
# Cloner le repo
git clone https://github.com/romaric-creator/GLOBEApp.git
cd GLOBEApp/backend

# Installer les dependances
npm install

# Lancer la base de donnees
docker compose up -d

# Configurer l'environnement
cp .env.example .env

# Generer le client Prisma et appliquer le schema
npx prisma generate
npx prisma db push

# Peupler la base avec les donnees initiales
npx prisma db seed

# Lancer le serveur en mode developpement
npm run start:dev
```

## Structure du projet

```
backend/
├── prisma/
│   ├── schema.prisma       # Schema de la base de donnees
│   └── seed.ts             # Donnees initiales
├── src/
│   ├── modules/            # Modules metier
│   ├── common/             # Utilitaires partages
│   ├── prisma/             # Service Prisma global
│   └── main.ts            # Point d'entree
├── docker-compose.yml      # PostgreSQL + Redis
└── package.json
```

## Utilisateur par defaut

- **Email** : admin@residence.local
- **Mot de passe** : admin123
- **Role** : Administrateur

## Licence

Projet prive - Tous droits reserves.
