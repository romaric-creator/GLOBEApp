import type { AxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
  const e = error as AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>;

  // Erreur réseau — backend inaccessible
  if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED' || !e.response) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion réseau.';
  }

  const status = e.response.status;
  const data = e.response.data;

  // Message du backend (NestJS envoie message: string | string[])
  if (data?.message) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    return msg;
  }

  // Fallbacks par code HTTP
  switch (status) {
    case 400: return 'Données invalides. Vérifiez les champs saisis.';
    case 401: return 'Email ou mot de passe incorrect.';
    case 403: return 'Vous n\'avez pas les droits pour effectuer cette action.';
    case 404: return 'Ressource introuvable.';
    case 409: return 'Conflit : cette entrée existe déjà.';
    case 422: return 'Données non traitables par le serveur.';
    case 429: return 'Trop de tentatives. Réessayez dans quelques instants.';
    case 500: return 'Erreur interne du serveur. Contactez l\'administrateur.';
    case 502:
    case 503: return 'Service temporairement indisponible. Réessayez dans quelques secondes.';
    default:  return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  }
}
