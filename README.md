# GLOBEApp

Application desktop de gestion commerciale destinee aux residences, hotels, restaurants, bars et PME.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Desktop** | Electron (Windows, Linux) |
| **Frontend** | React 19, Ant Design 6, TailwindCSS 4, React Query 5, Zustand, Vite 8 |
| **Backend** | NestJS (Node.js / TypeScript), Prisma ORM |
| **Base de donnees** | MySQL |
| **Auth** | JWT (Access + Refresh tokens), RBAC (admin, manager, caissier, serveur, employe) |

## Fonctionnalites

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
| Sauvegarde | Backup MySQL complet, historique |

### Modules metier

| Module | Description |
|--------|-------------|
| Hotel | Reservations (avec detection conflit), chambres, check-in/out, taux d'occupation |
| Bar & Restaurant | Tables, commandes multi-articles, workflow cuisine, gestion stock integree |
| Piscine & Loisirs | Tickets d'acces, abonnements avec expiration automatique |
| Salle de fete | Reservations avec detection de chevauchement horaire |

## Installation

### Application desktop (recommande)

Telecharger l'installateur depuis la page [Releases](https://github.com/romaric-creator/GLOBEApp/releases) :
- **Windows** : `GLOBE Manager Setup x.x.x.exe`
- **Linux** : `GLOBE-Manager-x.x.x.AppImage`

Au premier lancement, l'application propose deux modes :
- **Serveur** : ce poste heberge la base de donnees MySQL (configurer host, port, utilisateur, mot de passe, nom de base)
- **Poste client** : se connecter a un serveur existant sur le reseau local

### Prerequis (mode serveur)

- MySQL installe et demarre
- Une base de donnees creee (par defaut : `gestion_residence`)

L'application cree automatiquement les tables et les donnees initiales au premier demarrage.

### Developpement

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev          # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev                # http://localhost:3000 (proxy /api -> :3001)

# Electron (desktop)
npm run electron:dev
```

### Build desktop

```bash
cd frontend
npm run desktop:build      # Genere l'installateur dans frontend/release/
```

## Architecture

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Schema BDD MySQL
│   │   └── seed.ts                # Donnees initiales
│   ├── src/
│   │   ├── modules/               # Modules metier (auth, hotel, ventes, restaurant, etc.)
│   │   ├── common/                # Guards, decorators, filtres
│   │   ├── prisma/                # Service Prisma global
│   │   └── main.ts               # Point d'entree (port 3001)
├── frontend/
│   ├── electron/
│   │   ├── main.cjs               # Process principal Electron
│   │   ├── backend-runner.cjs     # Lancement du backend integre
│   │   ├── config.cjs             # Configuration persistante
│   │   └── preload.cjs            # Bridge IPC
│   ├── src/
│   │   ├── api/                   # Clients API (axios + intercepteur refresh)
│   │   ├── components/            # Layout, ProtectedRoute
│   │   ├── pages/                 # Pages par module
│   │   ├── store/                 # Zustand (auth)
│   │   └── hooks/                 # Hooks custom
│   └── public/
│       └── splash.html            # Ecran de demarrage + configuration initiale
└── README.md
```

## Securite

- Authentification JWT avec rotation automatique des tokens
- Controle d'acces par role (RBAC) sur les routes backend ET frontend
- Validation des DTOs via class-validator sur tous les endpoints
- Transactions Prisma pour l'integrite des donnees (ventes, stock, reservations)
- Verification caisse ouverte avant enregistrement de vente
- Soft-delete sur les produits (desactivation au lieu de suppression)

## Utilisateur par defaut

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@residence.local | admin123 |
| Manager | manager@residence.local | manager123 |

## Licence

Projet prive - Tous droits reserves.
