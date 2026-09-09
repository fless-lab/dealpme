# -*- coding: utf-8 -*-
"""Génère les paquets de connecteurs externes : un port (interface), des adaptateurs et un faux par dépendance."""
import os, json, textwrap

ROOT = os.path.join(os.path.dirname(__file__), "..", "codebases", "external_connectors")

CONNECTORS = {
    "registry": {
        "desc": "Registre des entreprises (CFE / RCCM) : mode API si disponible, sinon saisie manuelle supervisée (DP-CCI-011).",
        "adapters": ["cfe-api", "manual-entry"],
        "port": '''
export interface RegistryLookupRequest {
  rccmNumber: string;
}
export interface RegistryLookupResult {
  found: boolean;
  legalName?: string;
  legalForm?: string;
  registrationDate?: string; // ISO 8601
  status?: string;
  registeredAddress?: string;
  officers?: string[];
  /** Référence de source obligatoire : identifiant d'appel API, numéro d'échange de fichier ou identifiant de consultation opérateur. */
  sourceRef: string;
  verifiedAt: string; // ISO 8601
}
export interface RegistryPort {
  readonly mode: "api" | "manual";
  lookup(req: RegistryLookupRequest): Promise<RegistryLookupResult>;
}''',
    },
    "esign": {
        "desc": "Signature électronique qualifiée : prestataire togolais accrédité ARCEP (PSC). Parcours de repli papier géré côté API, pas ici.",
        "adapters": ["psc-accredited"],
        "port": '''
export interface SignatureRequest {
  documentSha256: string;
  documentTitle: string;
  signers: { personId: string; email: string; phoneE164: string }[];
  callbackUrl: string;
}
export interface SignatureEnvelope {
  providerRef: string;
  signingUrls: Record<string, string>; // personId -> URL de signature
}
export interface SignatureCompletion {
  providerRef: string;
  documentSha256: string;
  certificateChain: string;
  timestampToken: string;
  completedAt: string;
}
export interface ESignPort {
  createEnvelope(req: SignatureRequest): Promise<SignatureEnvelope>;
  /** Vérifie la signature du webhook AVANT tout traitement (exigence v0 : validation des signatures de webhook). */
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseCompletion(rawBody: string): SignatureCompletion;
}''',
    },
    "mobile-money": {
        "desc": "Paiement mobile money via agrégateur (CinetPay, Hub2, PayDunya, PayGate Global). Rails : T-Money, Flooz, Gozem Money. Prépayé, jamais récurrent.",
        "adapters": ["cinetpay", "hub2", "paydunya"],
        "port": '''
export interface PaymentRequest {
  idempotencyKey: string; // obligatoire : les rappels mobile money sont retentés
  amountXof: number; // entier XOF, pas de sous-unité
  payerPhoneE164: string;
  description: string;
  callbackUrl: string;
}
export type PaymentState = "AUTHORISED" | "CAPTURED" | "SETTLED" | "RECONCILED" | "FAILED";
export interface PaymentIntent {
  providerRef: string;
  state: PaymentState;
  redirectUrl?: string;
}
export interface PaymentEvent {
  providerRef: string;
  state: PaymentState;
  amountXof: number;
  occurredAt: string;
  rail?: "T_MONEY" | "FLOOZ" | "GOZEM_MONEY" | "OTHER";
}
export interface MobileMoneyPort {
  initiate(req: PaymentRequest): Promise<PaymentIntent>;
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseEvent(rawBody: string): PaymentEvent;
}''',
    },
    "archiving": {
        "desc": "Archivage électronique à valeur probante (PSAE accrédité) pour la piste d'audit de signature. Une table SQL n'est pas un service d'archivage.",
        "adapters": ["psae"],
        "port": '''
export interface ArchiveRequest {
  documentSha256: string;
  payload: Uint8Array;
  metadata: Record<string, string>;
  retentionYears: number; // 10 ans pour les preuves de signature
}
export interface ArchiveReceipt {
  archiveRef: string;
  archivedAt: string;
}
export interface ArchivingPort {
  archive(req: ArchiveRequest): Promise<ArchiveReceipt>;
  verify(archiveRef: string): Promise<{ intact: boolean; archivedAt: string }>;
}''',
    },
    "sms": {
        "desc": "SMS transactionnels (OTP, notices critiques). Fournisseur distinct de l'email. Consentement et désinscription gérés côté API.",
        "adapters": ["generic-http"],
        "port": '''
export interface SmsMessage {
  toE164: string;
  text: string; // français, sans caractère exotique pour limiter la segmentation
  category: "OTP" | "TRANSACTIONAL" | "MARKETING";
}
export interface SmsPort {
  send(msg: SmsMessage): Promise<{ providerRef: string }>;
}''',
    },
    "email": {
        "desc": "Email transactionnel. En local : Mailpit. Les messages non transactionnels exigent consentement et lien de désinscription.",
        "adapters": ["smtp"],
        "port": '''
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category: "TRANSACTIONAL" | "MARKETING";
  unsubscribeUrl?: string; // obligatoire si MARKETING
}
export interface EmailPort {
  send(msg: EmailMessage): Promise<{ providerRef: string }>;
}''',
    },
    "storage": {
        "desc": "Stockage objet compatible S3 (MinIO en local). Chiffrement côté serveur, versionnage, aucun accès public, URL pré-signées courtes liées à la session.",
        "adapters": ["s3"],
        "port": '''
export interface PutObjectRequest {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  classification: "PERSONAL" | "SENSITIVE_PERSONAL" | "CONFIDENTIAL_DEAL" | "INTERNAL";
}
export interface StoragePort {
  put(req: PutObjectRequest): Promise<{ versionId: string; sha256: string }>;
  get(bucket: string, key: string): Promise<Uint8Array>;
  /** Durée maximale courte (secondes). L'URL doit être invalidable en moins de 60 s via rotation de clé de session. */
  presignedGetUrl(bucket: string, key: string, ttlSeconds: number, sessionBinding: string): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
}''',
    },
    "remo": {
        "desc": "Remo.co : salons virtuels, stands et rendez-vous vidéo pour Deal-Connect et Guichet Diaspora (décision du 09/09/2026). Périmètre exact à cadrer avec la documentation API.",
        "adapters": ["remo-api"],
        "port": '''
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
}''',
    },
    "tax-partner": {
        "desc": "Module fiscal partenaire (simulation, télédéclaration simplifiée, attestation). Une panne partenaire ne doit jamais produire une fausse attestation. Partenaire à confirmer.",
        "adapters": ["partner-http"],
        "port": '''
export interface TaxSimulationRequest {
  taxpayerId: string;
  fiscalYear: number;
  inputs: Record<string, number>;
}
export interface TaxSimulationResult {
  providerRef: string;
  amountsXof: Record<string, number>;
  disclaimer: string; // responsabilité du contenu : partenaire
}
export interface TaxCertificateResult {
  status: "ISSUED" | "PENDING" | "UNAVAILABLE"; // UNAVAILABLE en cas de panne : jamais un succès simulé
  certificateRef?: string;
  issuedAt?: string;
}
export interface TaxPartnerPort {
  simulate(req: TaxSimulationRequest): Promise<TaxSimulationResult>;
  requestCertificate(taxpayerId: string): Promise<TaxCertificateResult>;
  health(): Promise<{ available: boolean }>;
}''',
    },
    "ai-provider": {
        "desc": "Fournisseur de modèle pour DealLens (V5). Aucun document VDR ne sort vers un outil public : uniquement le fournisseur sous contrat. Le filtrage des permissions a lieu AVANT l'appel.",
        "adapters": ["contracted-provider"],
        "port": '''
export interface AuthorizedChunk {
  documentId: string;
  versionId: string;
  page: number;
  anchor: string;
  text: string;
}
export interface GroundedAnswerRequest {
  question: string;
  /** Ensemble déjà filtré par permission ; le connecteur n'a pas le droit d'en élargir le périmètre. */
  authorizedChunks: AuthorizedChunk[];
  authorizationProfileHash: string;
  policyVersion: string;
}
export interface GroundedAnswer {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "INSUFFICIENT";
  citations: { documentId: string; versionId: string; page: number; anchor: string }[];
  potentialIssues: string[];
  openQuestions: string[];
  modelVersion: string;
}
export interface AiProviderPort {
  answer(req: GroundedAnswerRequest): Promise<GroundedAnswer>;
  embed(texts: string[]): Promise<number[][]>;
}''',
    },
}

PKG_TMPL = {
    "version": "0.1.0",
    "private": True,
    "type": "commonjs",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {"build": "tsc -p tsconfig.json", "typecheck": "tsc -p tsconfig.json --noEmit", "test": "vitest run --passWithNoTests"},
    "devDependencies": {"@dealpme/config": "*"},
}
TSCONFIG = '{\n  "extends": "../../../packages/config/tsconfig.lib.json",\n  "compilerOptions": { "outDir": "dist", "rootDir": "src" },\n  "include": ["src"]\n}\n'

def pascal(name):
    return "".join(p.capitalize() for p in name.split("-"))

for name, spec in CONNECTORS.items():
    d = os.path.join(ROOT, name)
    os.makedirs(os.path.join(d, "src", "adapters"), exist_ok=True)
    pkg = dict(PKG_TMPL)
    pkg = {"name": f"@dealpme/connector-{name}", "description": spec["desc"], **pkg}
    with open(os.path.join(d, "package.json"), "w", encoding="utf-8") as f:
        json.dump(pkg, f, ensure_ascii=False, indent=2); f.write("\n")
    with open(os.path.join(d, "tsconfig.json"), "w", encoding="utf-8") as f:
        f.write(TSCONFIG)
    port_name = [l for l in spec["port"].splitlines() if "Port {" in l][0].split()[2]
    with open(os.path.join(d, "src", "port.ts"), "w", encoding="utf-8") as f:
        f.write(f"/**\n * {spec['desc']}\n * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.\n */\n")
        f.write(textwrap.dedent(spec["port"]).strip() + "\n")
    # faux (tests, développement sans contrat signé)
    with open(os.path.join(d, "src", "fake.ts"), "w", encoding="utf-8") as f:
        f.write(f'''import type {{ {port_name} }} from "./port.js";

/**
 * Implémentation factice pour les tests et le développement tant qu'aucun contrat n'est signé.
 * Comportement déterministe, aucun appel réseau. Ne jamais l'activer en production.
 */
export function createFake{pascal(name)}(): {port_name} {{
  const notImplemented = (method: string) => () =>
    Promise.reject(new Error(`Faux connecteur {name} : méthode ${{method}} à implémenter dans le faux selon le scénario de test`));
  const port = {{}} as Record<string, unknown>;
  for (const m of PORT_METHODS) {{
    port[m] = notImplemented(m);
  }}
  {"port['mode'] = 'manual';" if name == "registry" else ""}
  {"port['verifyWebhook'] = () => true;" if "verifyWebhook" in spec["port"] else ""}
  return port as unknown as {port_name};
}}

export const PORT_METHODS = {json.dumps([l.split("(")[0].strip() for l in spec["port"].splitlines() if l.strip().endswith(">;") and "(" in l and not l.strip().startswith("//")])} as const;
''')
    for ad in spec["adapters"]:
        with open(os.path.join(d, "src", "adapters", f"{ad}.ts"), "w", encoding="utf-8") as f:
            f.write(f'''import type {{ {port_name} }} from "../port.js";

/**
 * Adaptateur {ad} pour le connecteur {name}.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface {pascal(ad)}Config {{
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}}

export function create{pascal(ad)}Adapter(_config: {pascal(ad)}Config): {port_name} {{
  throw new Error("Adaptateur {ad} non implémenté : intégration prévue selon la feuille de route");
}}
''')
    with open(os.path.join(d, "src", "index.ts"), "w", encoding="utf-8") as f:
        f.write('export * from "./port.js";\nexport * from "./fake.js";\n')
        for ad in spec["adapters"]:
            f.write(f'export * from "./adapters/{ad}.js";\n')
    with open(os.path.join(d, "README.md"), "w", encoding="utf-8") as f:
        f.write(f"# @dealpme/connector-{name}\n\n{spec['desc']}\n\n- `src/port.ts` : le contrat consommé par l'API et le worker.\n- `src/fake.ts` : implémentation factice pour les tests et le développement.\n- `src/adapters/` : un fichier par vendeur ({', '.join(spec['adapters'])}).\n\nRègle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.\n")
print("connecteurs générés :", ", ".join(CONNECTORS))
