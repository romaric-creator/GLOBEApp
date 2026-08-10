import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// Navigue vers une route et attend que le DOM soit prêt
function navigateTo(path: string, callback: () => void, delay = 400) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  setTimeout(callback, delay);
}

export function startTour() {
  // Étape 1 : intro générale — pas de navigation nécessaire
  const step0 = driver({
    showProgress: false,
    nextBtnText: 'Commencer',
    doneBtnText: 'Commencer',
    animate: true,
    overlayOpacity: 0.65,
    onDestroyStarted: () => {
      step0.destroy();
      runMainTour();
    },
    steps: [
      {
        popover: {
          title: '👋 Bienvenue sur GLOBE Manager',
          description:
            'Cette visite guidee vous presente les fonctionnalites principales de l\'application. Utilisez les boutons Suivant / Precedent pour naviguer. Duree estimee : 2 minutes.',
          align: 'center',
        },
      },
    ],
  });
  step0.drive();
}

function runMainTour() {
  // S'assure qu'on part du dashboard
  navigateTo('/dashboard', () => {
    const driverObj = driver({
      showProgress: true,
      progressText: 'Etape {{current}} sur {{total}}',
      nextBtnText: 'Suivant →',
      prevBtnText: '← Precedent',
      doneBtnText: '✓ Terminer',
      animate: true,
      overlayOpacity: 0.6,
      allowClose: true,
      steps: [
        // ── INTERFACE GÉNÉRALE ──────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '📋 Menu de navigation',
            description:
              'La barre de gauche donne acces a tous les modules : Hotel, Restaurant, Clients, Stock, Caisses, Comptabilite... Elle reste visible en permanence et peut se reduire avec le bouton en haut.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-search',
          popover: {
            title: '🔍 Recherche globale',
            description:
              'Retrouvez instantanement un client, un produit ou une page depuis n\'importe ou dans l\'application. Raccourci clavier : Ctrl+K.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-user-menu',
          popover: {
            title: '👤 Votre compte',
            description:
              'Affiche votre nom et role (admin, manager, caissier, serveur...). Cliquez pour vous deconnecter.',
            side: 'bottom',
            align: 'end',
          },
        },

        // ── DASHBOARD ────────────────────────────────────────────────
        {
          element: '#tour-dashboard-kpis',
          popover: {
            title: '📊 Indicateurs clés (KPIs)',
            description:
              'Les KPIs principaux s\'affichent ici : chiffre d\'affaires du mois, taux d\'occupation des chambres, nombre de clients et personnel present. Chaque carte est cliquable pour acceder au module correspondant.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-dashboard-charts',
          popover: {
            title: '📈 Graphiques de performance',
            description:
              'Courbe du CA sur les 7 derniers jours (total, hotel, restaurant) et etat des chambres en temps reel. Les donnees se mettent a jour automatiquement.',
            side: 'top',
          },
        },

        // ── HÔTEL ────────────────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '🏨 Module Hotel',
            description:
              'Cliquez sur "Hotel" dans le menu pour gerer les reservations et les chambres. Nous allons y acceder maintenant.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/hotel', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-hotel-page',
          popover: {
            title: '🏨 Gestion Hotel',
            description:
              'Le module Hotel comporte deux onglets : Reservations et Chambres. Toute la gestion du sejour client se fait ici, de la reservation au check-out.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-hotel-tabs',
          popover: {
            title: '📑 Onglets Hotel',
            description:
              'L\'onglet Reservations permet de creer et suivre les sejours (check-in, check-out, annulation). L\'onglet Chambres gere l\'inventaire et le statut de chaque chambre (disponible, occupee, maintenance).',
            side: 'bottom',
          },
        },

        // ── RESTAURANT ───────────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '🍽️ Bar & Restaurant',
            description:
              'Le module Restaurant gere les commandes en salle. Passons-y.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/restaurant', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-restaurant-stats',
          popover: {
            title: '📊 Statistiques restaurant',
            description:
              'En haut de la page : le nombre de commandes en preparation, le total de la journee et le chiffre d\'affaires. Ces chiffres se rafraichissent a chaque action.',
            side: 'bottom',
          },
        },
        {
          element: '#tour-restaurant-actions',
          popover: {
            title: '➕ Nouvelle commande',
            description:
              'Creez une commande en choisissant les produits du menu (plats et boissons). Indiquez une reference de table si necessaire (ex: "Table 5"). Le stock est decremente automatiquement. Deux actions possibles : Terminer ou Annuler (le stock est alors restitue).',
            side: 'bottom',
          },
        },

        // ── CLIENTS ──────────────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '👥 Gestion des Clients',
            description:
              'Gerez votre fichier client (particuliers et entreprises). Acces depuis le menu.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/clients', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-clients-page',
          popover: {
            title: '👥 Fichier clients',
            description:
              'Creez, modifiez et recherchez vos clients. Chaque client est lie a ses reservations hotel, commandes restaurant et tickets piscine. La recherche fonctionne sur le nom, prenom, telephone et email.',
            side: 'bottom',
          },
        },

        // ── PRODUITS & STOCK ─────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '📦 Produits & Stock',
            description:
              'Gerez le catalogue de produits (boissons, plats, accessoires) et suivez les niveaux de stock.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/produits', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-produits-tabs',
          popover: {
            title: '📦 Catalogue & Stock',
            description:
              'Trois onglets : Produits (catalogue avec prix et stock actuel), Categories (organisation par famille), Mouvements (historique entrees/sorties). Des alertes apparaissent sur le dashboard quand un produit passe sous son seuil d\'alerte.',
            side: 'bottom',
          },
        },

        // ── CAISSE HÔTEL ─────────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '💰 Caisse Hotel',
            description:
              'La caisse hotel encaisse les factures de sejour. Chaque session correspond a une ouverture de caisse.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/caisse-hotel', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-caisse-hotel-header',
          popover: {
            title: '💰 Caisse Hotel',
            description:
              'Ouvrez une session en indiquant le fond de caisse initial. Encaissez ensuite les factures de sejour impayees (generees automatiquement au check-out). A la cloture, comparez le montant theorique et le montant reel en caisse pour detecter les ecarts.',
            side: 'bottom',
          },
        },

        // ── CAISSE RESTAURANT ────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '💵 Caisse Restaurant',
            description:
              'La caisse restaurant fonctionne de maniere independante. Elle encaisse les commandes terminees.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/caisse-restaurant', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-caisse-resto-header',
          popover: {
            title: '💵 Caisse Restaurant / Bar',
            description:
              'Ouvrez une session, puis encaissez les commandes marquees TERMINEE et pas encore payees. Choisissez le moyen de paiement (especes, carte, mobile money...). La cloture calcule automatiquement le total theorique et l\'ecart.',
            side: 'bottom',
          },
        },

        // ── RAPPORTS ─────────────────────────────────────────────────
        {
          element: '#tour-sidebar',
          popover: {
            title: '📈 Rapports & Analyses',
            description:
              'Consultez les rapports financiers : CA par module, taux d\'occupation, top produits, resume mensuel avec benefice net.',
            side: 'right',
            onNextClick: () => {
              driverObj.moveNext();
              navigateTo('/rapports', () => driverObj.moveNext(), 500);
            },
          },
        },
        {
          element: '#tour-content',
          popover: {
            title: '📈 Rapports',
            description:
              'Choisissez une periode et comparez le CA entre les modules (hotel, restaurant, piscine, salle de fete). Les rapports mensuels incluent les depenses et le benefice net. Accessible uniquement aux roles admin et manager.',
            side: 'top',
          },
        },

        // ── FIN ───────────────────────────────────────────────────────
        {
          popover: {
            title: '✅ Vous etes pret !',
            description:
              'Vous connaissez maintenant les fonctionnalites principales de GLOBE Manager. Pour relancer cette visite a tout moment, cliquez sur l\'icone ❓ dans la barre du haut. Bonne utilisation !',
            align: 'center',
            onNextClick: () => {
              driverObj.destroy();
              navigateTo('/dashboard', () => {}, 0);
            },
          },
        },
      ],
    });

    driverObj.drive();
  }, 300);
}
