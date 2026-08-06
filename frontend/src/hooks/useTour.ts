import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Suivant',
    prevBtnText: 'Precedent',
    doneBtnText: 'Terminer',
    animate: true,
    overlayOpacity: 0.6,
    steps: [
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Menu de navigation',
          description: 'Acces a tous les modules : Hotel, Restaurant, Piscine, Ventes, Comptabilite, etc.',
          side: 'right',
        },
      },
      {
        element: '#tour-search',
        popover: {
          title: 'Recherche globale',
          description: 'Recherchez rapidement un client, un produit ou une page. Raccourci clavier : Ctrl+K.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-user-menu',
        popover: {
          title: 'Votre compte',
          description: 'Acces a votre profil et deconnexion.',
          side: 'bottom',
        },
      },
      {
        element: '#tour-content',
        popover: {
          title: 'Zone de travail',
          description: 'Le contenu de chaque module s\'affiche ici. Les onglets permettent de naviguer entre les sous-sections.',
          side: 'top',
        },
      },
      {
        popover: {
          title: 'Vous etes pret !',
          description: 'Consultez le Dashboard pour un apercu global, ou naviguez directement vers un module. Bon travail !',
        },
      },
    ],
  });

  driverObj.drive();
}
