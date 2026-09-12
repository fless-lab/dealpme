export interface ManagedEvent {
  id:string; title:string; description:string|null; startsAt:string; endsAt:string; capacity:number; campaignId:string|null;
  status:string; audience:string; revision:number; provider:string; syncError:string|null; publicationKey:string|null;
  branding:{label:string;accent:string;welcome:string;logoUrl?:string|undefined;coverUrl?:string|undefined;welcomeMediaUrl?:string|undefined};
  brandingOrigin:{scope:"ACCOUNT"|"EVENT";version:string};
  registrations?:{id:string;displayName:string;consentContactAt:string|null;providerConsentAt:string|null;invitationState:string;providerRole:string;joinedAt:string|null}[];
  reservation?:{accountKey:string;state:string;startsAt:string;endsAt:string}|null;
}
export interface Appointment { id:string;requestedSlot:string;status:string;eventId:string|null;confirmedBy:string|null;decisionReason:string|null }
export const EVENT_STATE:Record<string,string>={DRAFT:"Brouillon",PUBLISHING:"Publication en cours",PUBLISHED:"Publié",CREATE_REJECTED:"Création refusée — à corriger",SYNC_UNKNOWN:"Synchronisation à rapprocher",CANCEL_PENDING:"Annulation à confirmer",CANCELLED:"Annulé",CLOSED:"Clôturé"};
export const APPOINTMENT_STATE:Record<string,string>={REQUESTED:"À instruire",CONFIRMING:"Salle en préparation",CONFIRMED:"Confirmé",REFUSED:"Refusé",CANCELLED:"Annulé",HELD:"Entretien tenu"};
