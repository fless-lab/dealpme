/**
 * Remo.co : salons virtuels, stands et rendez-vous vidéo pour Deal-Connect et Guichet Diaspora (décision du 09/09/2026). Périmètre exact à cadrer avec la documentation API.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface RemoEventRequest {
  requestKey: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  branding: { label: string; accent: string; welcome: string };
}
export interface RemoEvent {
  remoEventId: string;
  joinUrl: string;
  simulated: boolean;
}
export interface RemoAttendance {
  remoEventId: string;
  externalUserId: string; // identifiant DealPME, jamais de donnée nominative supplémentaire
  joinedAt: string;
  leftAt?: string | undefined;
}
export interface RemoPort {
  createEvent(req: RemoEventRequest): Promise<RemoEvent>;
  cancelEvent(requestKey: string): Promise<void>;
  attendance(remoEventId: string): Promise<RemoAttendance[]>;
  /** Lien de connexion unique par participant (SSO ou jeton), sans exposer l'identité aux autres participants. */
  participantJoinUrl(remoEventId: string, externalUserId: string, displayName: string): Promise<string>;
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseAttendance(rawBody: string): RemoAttendance[];
}

export class RemoError extends Error {
  constructor(readonly code: "DISABLED" | "UNAVAILABLE" | "UNKNOWN" | "REJECTED" | "MALFORMED") {
    super(`Intégration événementielle : ${code}`); this.name = "RemoError";
  }
}
