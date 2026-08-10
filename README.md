# GLOBEApp

Application de gestion commerciale et de comptabilite destinee aux residences, hotels, restaurants, bars et PME.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 19, Ant Design 6, TailwindCSS 4, React Query 5, Zustand, Vite 8 |
| **Backend** | NestJS (Node.js / TypeScript), Prisma ORM |
| **Base de donnees** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Auth** | JWT (Access + Refresh tokens), RBAC (admin, manager, caissier, serveur, employe) |
| **Infra** | Docker & Docker Compose, Nginx |

## Modules

### Modules principaux

| Module | Description |
|--------|-------------|
| Authentification & Securite | Gestion des utilisateurs, roles et permissions, refresh token automatique |
| Tableau de Bord | KPI temps reel, statistiques par module, taux d'occupation |
| Gestion des Clients | Repertoire clients, creances, historique |
| Produits & Stock | Catalogue, categories, mouvements stock, seuils d'alerte, vue grille |
| Ventes & Caisse | Enregistrement ventes, tickets, avoirs, cloture caisse avec ecarts |
| Gestion du Personnel | Fiches employes, contrats, conges (avec detection chevauchement), pointage |
| Comptabilite | Plan comptable, ecritures en partie double, clotures periodiques |
| Rapports & Statistiques | Chiffre d'affaires, occupation hotel, top produits, resume mensuel |
| Sauvegarde | Backup PostgreSQL complet/incrementiel, historique |

### Modules metier

| Module | Description |
|--------|-------------|
| Hotel | Reservations (avec detection conflit), chambres, check-in/out, taux d'occupation |
| Bar & Restaurant | Tables, commandes multi-articles, workflow cuisine, gestion stock integree |
| Piscine & Loisirs | Tickets d'acces, abonnements avec expiration automatique |
| Salle de fete | Reservations avec detection de chevauchement horaire |

## Architecture

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Schema BDD (23 index, cascades)
│   │   ├── migrations/            # Migrations SQL
│   │   └── seed.ts                # Donnees initiales
│   ├── src/
│   │   ├── modules/               # Modules metier (auth, hotel, ventes, restaurant, etc.)
│   │   ├── common/                # Guards, decorators, filtres
│   │   ├── prisma/                # Service Prisma global
│   │   └── main.ts               # Point d'entree (port 3001)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                   # Clients API (axios + intercepteur refresh)
│   │   ├── components/            # Layout, ProtectedRoute
│   │   ├── pages/                 # Pages par module
│   │   ├── store/                 # Zustand (auth)
│   │   └── hooks/                 # Hooks custom (useAuth)
│   ├── Dockerfile
│   └── nginx.conf                 # Reverse proxy /api → backend
├── docker-compose.yml             # Orchestration complète
└── README.md
```

## Installation

### Prerequis

- Docker & Docker Compose

### Lancement (production)

```bash
git clone https://github.com/romaric-creator/GLOBEApp.git
cd GLOBEApp

# Lancer tous les services
docker compose up -d

# L'application est accessible sur http://localhost:8080
```

### Lancement (developpement)

```bash
# Backend
cd backend
npm install
cp .env.example .env
docker compose up -d postgres redis
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev          # http://localhost:3001

# Frontend
cd ../frontend
npm install
npm run dev                # http://localhost:3000 (proxy /api → :3001)
```

## Securite

- Authentification JWT avec rotation automatique des tokens
- Controle d'acces par role (RBAC) sur les routes backend ET frontend
- Validation des DTOs via class-validator sur tous les endpoints
- Protection CSRF, rate limiting sur l'auth
- Transactions Prisma pour l'integrite des donnees (ventes, stock, reservations)
- Verification caisse ouverte avant enregistrement de vente
- Soft-delete sur les produits (desactivation au lieu de suppression)

## Utilisateur par defaut

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@residence.local | admin123 |
| Manager | manager@residence.local | manager123 |

## Ports

| Service | Port |
|---------|------|
| Frontend (nginx) | 8080 |
| Backend (NestJS) | 3001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Vite dev server | 3000 |

## Licence

Projet prive - Tous droits reserves.
