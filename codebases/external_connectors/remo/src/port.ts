/**
 * Remo.co : salons virtuels, stands et rendez-vous vidéo pour Deal-Connect et Guichet Diaspora (décision du 09/09/2026). Périmètre exact à cadrer avec la documentation API.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface RemoEventRequest {
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  brandingProfile?: string;
}
export interface RemoEvent {
  remoEventId: string;
  joinUrl: string;
}
export interface RemoAttendance {
  remoEventId: string;
  externalUserId: string; // identifiant DealPME, jamais de donnée nominative supplémentaire
  joinedAt: string;
  leftAt?: string;
}
export interface RemoPort {
  createEvent(req: RemoEventRequest): Promise<RemoEvent>;
  /** Lien de connexion unique par participant (SSO ou jeton), sans exposer l'identité aux autres participants. */
  participantJoinUrl(remoEventId: string, externalUserId: string, displayName: string): Promise<string>;
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseAttendance(rawBody: string): RemoAttendance[];
}
