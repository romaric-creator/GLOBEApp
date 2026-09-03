import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

function navigateTo(path: string, callback: () => void, delay = 500) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  setTimeout(callback, delay);
}

export function startTour() {
  let driverObj: ReturnType<typeof driver>;

  driverObj = driver({
    showProgress: true,
    progressText: 'Etape {{current}} sur {{total}}',
    nextBtnText: 'Suivant →',
    prevBtnText: '← Precedent',
    doneBtnText: '✓ Terminer',
    animate: true,
    overlayOpacity: 0.6,
    allowClose: true,
    steps: [

      // ── BIENVENUE ────────────────────────────────────────────────
      {
        popover: {
          title: 'Bienvenue sur GLOBE Manager',
          description:
            'Cette visite guidee vous presente toutes les fonctionnalites de l\'application. Utilisez les boutons Suivant / Precedent pour naviguer.',
          align: 'center',
          nextBtnText: 'Commencer la visite →',
          onNextClick: () => {
            navigateTo('/dashboard', () => driverObj.moveNext(), 400);
          },
        },
      },

      // ── INTERFACE GÉNÉRALE ───────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Menu de navigation',
          description:
            'La barre de gauche donne acces a tous les modules : Hotel, Restaurant, Piscine, Personnel, Caisses, Comptabilite... Elle reste visible en permanence.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#tour-search',
        popover: {
          title: 'Recherche globale',
          description:
            'Retrouvez instantanement un client, un produit ou une page. Raccourci clavier : Ctrl+K.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-user-menu',
        popover: {
          title: 'Votre compte',
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
          title: 'Indicateurs cles (KPIs)',
          description:
            'Chiffre d\'affaires du mois, taux d\'occupation, nombre de clients et alertes de stock. Chaque carte est cliquable pour acceder au module correspondant.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-dashboard-charts',
        popover: {
          title: 'Graphiques de performance',
          description:
            'Courbe du CA sur les 7 derniers jours et etat des chambres en temps reel. Les donnees se mettent a jour automatiquement.',
          side: 'top',
        },
      },

      // ── HÔTEL ────────────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Module Hotel',
          description: 'Gestion des reservations et des chambres. Nous allons y acceder.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/hotel', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-hotel-page',
        popover: {
          title: 'Gestion Hotel',
          description:
            'Centralise toute la gestion du sejour client : reservation, check-in, check-out, facturation.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-hotel-tabs',
        popover: {
          title: 'Reservations & Chambres',
          description:
            'Reservations : creez et suivez les sejours, effectuez les check-in/out, generez les factures. Chambres : inventaire et statut de chaque chambre.',
          side: 'bottom',
        },
      },

      // ── RESTAURANT ───────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Bar & Restaurant',
          description: 'Gestion des commandes en salle et au bar.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/restaurant', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-restaurant-stats',
        popover: {
          title: 'Statistiques restaurant',
          description:
            'Commandes en preparation, total du jour et chiffre d\'affaires. Ces chiffres se rafraichissent a chaque action.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-restaurant-actions',
        popover: {
          title: 'Nouvelle commande',
          description:
            'Creez une commande, choisissez les produits et indiquez un numero de chambre si le client charge sur son sejour. Le stock est decremente automatiquement.',
          side: 'bottom',
        },
      },

      // ── PISCINE ──────────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Piscine & Loisirs',
          description: 'Entrees piscine, abonnements et vente/location de materiel.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/piscine', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-piscine-page',
        popover: {
          title: 'Piscine & Loisirs',
          description:
            'Trois onglets : Tickets (entrees journalieres), Abonnements (mensuel/annuel), Accessoires (vente et location de materiel).',
          side: 'bottom',
        },
      },
      {
        element: '#tour-piscine-tabs',
        popover: {
          title: 'Ticket unifie',
          description:
            'Lors de la creation d\'un ticket, ajoutez directement des accessoires dans le meme formulaire. Un seul recu PDF est genere avec le code ticket (ex: PSC-0001).',
          side: 'bottom',
        },
      },

      // ── SALLE DE FETE ────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Salle de fete',
          description: 'Reservations de la salle des fetes.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/salle-fete', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-salle-fete-page',
        popover: {
          title: 'Salle de fete',
          description:
            'Reservations avec statut (En attente / Confirmee / Terminee) et types de formules tarifaires (cocktail, mariage, seminaire...).',
          side: 'bottom',
        },
      },

      // ── CLIENTS ──────────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Clients',
          description: 'Fichier client centralise.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/clients', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-clients-page',
        popover: {
          title: 'Fichier clients',
          description:
            'Creez et recherchez vos clients. Chaque fiche est liee aux reservations hotel, billets piscine et reservations de salle. Recherche sur nom, telephone et email.',
          side: 'bottom',
        },
      },

      // ── PERSONNEL ────────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Personnel',
          description: 'Gestion RH : employes, pointages et conges.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/personnel', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-personnel-page',
        popover: {
          title: 'Gestion du personnel',
          description:
            'Employes (fiches, contrats, salaires), Pointages (heures d\'arrivee et depart), Conges (demandes, validation, soldes).',
          side: 'bottom',
        },
      },

      // ── PRODUITS & STOCK ─────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Produits & Stock',
          description: 'Catalogue produits et suivi des niveaux de stock.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/produits', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-produits-tabs',
        popover: {
          title: 'Catalogue & Mouvements',
          description:
            'Produits (catalogue avec stock actuel), Categories, Mouvements (historique entrees/sorties). Des alertes apparaissent sur le dashboard quand un produit passe sous son seuil.',
          side: 'bottom',
        },
      },

      // ── CAISSE HÔTEL ─────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Caisse Hotel',
          description: 'Encaissement des factures de sejour.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/caisse-hotel', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-caisse-hotel-header',
        popover: {
          title: 'Caisse Hotel',
          description:
            'Ouvrez une session avec le fond initial. Encaissez les factures impayees generees au check-out. A la cloture, comparez le theorique et le reel pour detecter les ecarts.',
          side: 'bottom',
        },
      },

      // ── CAISSE RESTAURANT ────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Caisse Restaurant',
          description: 'Encaissement des commandes restaurant / bar.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/caisse-restaurant', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-caisse-resto-header',
        popover: {
          title: 'Caisse Restaurant / Bar',
          description:
            'Ouvrez une session puis encaissez les commandes TERMINEE. Choisissez le moyen de paiement. La cloture calcule l\'ecart entre theorique et reel.',
          side: 'bottom',
        },
      },

      // ── COMPTABILITÉ ─────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Comptabilite',
          description: 'Suivi financier detaille : recettes reelles et depenses.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/comptabilite', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-comptabilite-page',
        popover: {
          title: 'Comptabilite',
          description:
            'Recettes (encaissements reels par caisse) et depenses saisies manuellement par centre (Hotel, Restaurant, Piscine...). La tresorerie nette se met a jour a chaque mouvement.',
          side: 'bottom',
        },
      },

      // ── RAPPORTS ─────────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Rapports',
          description: 'Statistiques globales en lecture seule.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/rapports', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-rapports-page',
        popover: {
          title: 'Rapports & Statistiques',
          description:
            'CA par module, taux d\'occupation, top produits, resume mensuel. Choisissez une periode et exportez en CSV ou imprimez.',
          side: 'bottom',
        },
      },

      // ── SAUVEGARDE ───────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Sauvegarde',
          description: 'Sauvegarde et restauration de la base de donnees.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/sauvegarde', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-sauvegarde-page',
        popover: {
          title: 'Sauvegarde & Restauration',
          description:
            'Sauvegardes completes ou incrementales. L\'historique liste toutes les sauvegardes avec taille, date et statut. Accessible aux administrateurs uniquement.',
          side: 'bottom',
        },
      },

      // ── PARAMÈTRES ───────────────────────────────────────────────
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Parametres',
          description: 'Configuration generale de l\'application.',
          side: 'right',
          onNextClick: () => {
            navigateTo('/parametres', () => driverObj.moveNext(), 500);
          },
        },
      },
      {
        element: '#tour-parametres-page',
        popover: {
          title: 'Parametres',
          description:
            'Comptes utilisateurs, roles et permissions, connexion reseau/serveur, synchronisation cloud et informations sur la version.',
          side: 'bottom',
        },
      },

      // ── FIN ───────────────────────────────────────────────────────
      {
        popover: {
          title: 'Vous etes pret !',
          description:
            'Vous connaissez maintenant l\'ensemble des modules de GLOBE Manager. Pour relancer cette visite a tout moment, cliquez sur l\'icone ? dans la barre du haut. Bonne utilisation !',
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
}
