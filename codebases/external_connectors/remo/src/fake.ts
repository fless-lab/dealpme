import type { RemoAttendance, RemoEvent, RemoEventRequest, RemoPort } from "./port.js";

/**
 * Faux connecteur Remo.co : déterministe, sans réseau. Sert au développement et aux tests tant que
 * le cadrage de l'API Remo (jalon J14) n'est pas fait. La vérification de signature reste assurée
 * par l'API (HMAC sur le corps brut), pas par ce faux : verifyWebhook renvoie toujours vrai.
 */
export function createFakeRemo(): RemoPort {
  let counter = 0;
  return {
    async createEvent(req: RemoEventRequest): Promise<RemoEvent> {
      counter += 1;
      const remoEventId = `fake-remo-${counter}-${req.startsAt.slice(0, 10)}`;
      return { remoEventId, joinUrl: `http://127.0.0.1:8028/unavailable`, simulated: true };
    },
    async participantJoinUrl(remoEventId: string, externalUserId: string, displayName: string): Promise<string> {
      void remoEventId; void externalUserId; void displayName;
      throw new Error("Le faux unitaire ne délivre pas de lien live ; utiliser le simulateur local");
    },
    async cancelEvent() {},
    async attendance() { return []; },
    verifyWebhook(): boolean {
      return true;
    },
    parseAttendance(rawBody: string): RemoAttendance[] {
      const parsed = JSON.parse(rawBody) as { events?: RemoAttendance[] };
      return Array.isArray(parsed.events) ? parsed.events : [];
    },
  };
}

export const PORT_METHODS = ["createEvent", "participantJoinUrl", "verifyWebhook", "parseAttendance"] as const;
