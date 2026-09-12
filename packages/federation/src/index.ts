import { IdentityProvider, ServiceProvider, SamlLib, Extractor, setSchemaValidator } from "samlify";
import { validateXML } from "xmllint-wasm";
import { createPrivateKey, createPublicKey, createHash, randomUUID, X509Certificate } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST";
const REDIRECT = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
const EMAIL = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";
const RSA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const schemaFolder = join(dirname(require.resolve("@authenio/samlify-xmllint-wasm")), "schemas");
const schemaNames = ["saml-schema-protocol-2.0.xsd", "datatypes.dtd", "saml-schema-assertion-2.0.xsd", "xmldsig-core-schema.xsd", "XMLSchema.dtd", "xenc-schema.xsd"];
const [schema, ...preload] = schemaNames.map(fileName => ({ fileName, contents: readFileSync(join(schemaFolder, fileName), "utf8") }));
function boundedXml(xml: string) {
  if (Buffer.byteLength(xml) > 65536 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new FederationError("INVALID_REQUEST");
}
setSchemaValidator({ validate: async (xml: string) => {
  boundedXml(xml);
  const result = await validateXML({ xml: [{ fileName: "request.xml", contents: xml }], extension: "schema", schema: [schema!.contents], preload });
  if (!result.valid) throw new FederationError("INVALID_REQUEST");
  return true;
} });

export class FederationError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "EXPIRED" | "REAUTH_REQUIRED" | "INVALID_IDENTITY") { super(`SSO : ${code}`); this.name = "FederationError"; }
}
export interface SamlConfiguration {
  idpEntityId: string; ssoUrl: string; spEntityId: string; acsUrl: string;
  privateKey: string; certificate: string; previousCertificate?: string | undefined;
}
export interface PreparedSamlRequest { requestId: string; issuedAt: string; forceAuthn: boolean; relayState: string; configurationId: string }

/** IdP SAML standard, sans dépendance à une table DealPME ni algorithme cryptographique maison. */
export function createSamlIdentityProvider(config: SamlConfiguration) {
  const configurationId = createHash("sha256").update(JSON.stringify([config.idpEntityId,config.ssoUrl,config.spEntityId,config.acsUrl])).digest("hex");
  for (const url of [config.ssoUrl, config.acsUrl, config.idpEntityId]) {
    const value = new URL(url);
    if (value.protocol !== "https:" || value.username || value.password || value.hash || value.search) throw new Error("Configuration SAML : URL HTTPS fixe attendue");
  }
  if (!config.spEntityId || config.spEntityId.length > 2048) throw new Error("Entity ID SP manquant");
  const key = createPrivateKey(config.privateKey), cert = new X509Certificate(config.certificate);
  if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 || !createPublicKey(key).equals(cert.publicKey) || Date.parse(cert.validTo) <= Date.now() || Date.parse(cert.validFrom) > Date.now()) throw new Error("Clé et certificat RSA SAML invalides ou expirés");
  const idp = IdentityProvider({ entityID: config.idpEntityId, privateKey: config.privateKey, signingCert: config.certificate,
    nameIDFormat: [EMAIL], wantAuthnRequestsSigned: false, isAssertionEncrypted: false, requestSignatureAlgorithm: RSA256,
    singleSignOnService: [{ Binding: REDIRECT, Location: config.ssoUrl }, { Binding: POST, Location: config.ssoUrl }],
  });
  // Le signataire emploie une seule clé ; le document public peut annoncer la clé précédente pendant la rotation.
  if (config.previousCertificate) new X509Certificate(config.previousCertificate);
  const publicMetadata = config.previousCertificate ? IdentityProvider({ entityID: config.idpEntityId, signingCert: [config.certificate, config.previousCertificate], nameIDFormat: [EMAIL], wantAuthnRequestsSigned: false, singleSignOnService: [{ Binding: REDIRECT, Location: config.ssoUrl }, { Binding: POST, Location: config.ssoUrl }] }) : idp;
  const sp = ServiceProvider({ entityID: config.spEntityId, authnRequestsSigned: false, wantAssertionsSigned: true, wantMessageSigned: false, nameIDFormat: [EMAIL], assertionConsumerService: [{ Binding: POST, Location: config.acsUrl, isDefault: true }] });

  async function prepare(samlRequest: string, binding: "redirect" | "post", relayState = ""): Promise<PreparedSamlRequest> {
    try {
      if (samlRequest.length > 88000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(samlRequest) || Buffer.byteLength(relayState) > 80) throw new FederationError("INVALID_REQUEST");
      const raw = Buffer.from(samlRequest, "base64");
      const xml = (binding === "redirect" ? inflateRawSync(raw, { maxOutputLength: 65536 }) : raw).toString("utf8");
      boundedXml(xml);
      // La bibliothèque effectue la validation XSD et vérifie l'Issuer ; nous épinglons aussi les destinations.
      await idp.parseLoginRequest(sp, "post", { body: { SAMLRequest: Buffer.from(xml).toString("base64") } });
      const fields = Extractor.extract(xml, [{ key: "request", localPath: ["AuthnRequest"], attributes: ["ID", "Version", "IssueInstant", "Destination", "AssertionConsumerServiceURL", "AssertionConsumerServiceIndex", "ProtocolBinding", "ForceAuthn", "IsPassive"] }, { key: "policy", localPath: ["AuthnRequest", "NameIDPolicy"], attributes: ["Format", "AllowCreate"] }, { key: "issuer", localPath: ["AuthnRequest", "Issuer"], attributes: [] }]);
      const request = fields.request as Record<string, string>;
      const policy = fields["policy"] as Record<string, string> | undefined;
      if (!request || fields.issuer !== config.spEntityId || request["version"] !== "2.0" || !/^[_A-Za-z][\w.:-]{0,200}$/.test(request["id"] ?? "") || request["destination"] !== config.ssoUrl
        || (request["assertionConsumerServiceUrl"] && request["assertionConsumerServiceUrl"] !== config.acsUrl)
        || (request["assertionConsumerServiceIndex"] && request["assertionConsumerServiceIndex"] !== "0")
        || (request["protocolBinding"] && request["protocolBinding"] !== POST)
        || (policy?.["format"] && policy["format"] !== EMAIL)) throw new FederationError("INVALID_REQUEST");
      const issuedAt = request["issueInstant"] ?? "";
      if (!Number.isFinite(Date.parse(issuedAt)) || Date.parse(issuedAt) < Date.now() - 300000 || Date.parse(issuedAt) > Date.now() + 30000) throw new FederationError("EXPIRED");
      if (request["isPassive"] === "true" || request["isPassive"] === "1") throw new FederationError("INVALID_REQUEST");
      return { requestId: request["id"]!, issuedAt, forceAuthn: request["forceAuthn"] === "true" || request["forceAuthn"] === "1", relayState, configurationId };
    } catch (error) { if (error instanceof FederationError) throw error; throw new FederationError("INVALID_REQUEST"); }
  }

  async function respond(request: PreparedSamlRequest, identity: { email: string; authenticatedAt: Date }) {
    if (request.configurationId !== configurationId) throw new FederationError("INVALID_REQUEST");
    if (!/^[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/.test(identity.email) || identity.email.length > 254 || !Number.isFinite(identity.authenticatedAt.getTime())) throw new FederationError("INVALID_IDENTITY");
    if (Date.parse(request.issuedAt) < Date.now() - 300000) throw new FederationError("EXPIRED");
    if (request.forceAuthn && identity.authenticatedAt.getTime() < Date.parse(request.issuedAt)) throw new FederationError("REAUTH_REQUIRED");
    const now = new Date(), until = new Date(now.getTime() + 90000), id = `_${randomUUID()}`;
    const response = await idp.createLoginResponse(sp, { extract: { request: { id: request.requestId } } }, "post", { email: identity.email }, {
      relayState: request.relayState,
      customTagReplacement: template => ({ id, context: SamlLib.replaceTagsByValue(template.replace("{AuthnStatement}", '<saml:AuthnStatement AuthnInstant="{AuthnInstant}" SessionIndex="{SessionIndex}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>'), {
        ID: id, AssertionID: `_${randomUUID()}`, Destination: config.acsUrl, Audience: config.spEntityId, EntityID: config.spEntityId,
        SubjectRecipient: config.acsUrl, Issuer: config.idpEntityId, IssueInstant: now.toISOString(), AssertionConsumerServiceURL: config.acsUrl,
        StatusCode: "urn:oasis:names:tc:SAML:2.0:status:Success", ConditionsNotBefore: new Date(now.getTime() - 30000).toISOString(),
        ConditionsNotOnOrAfter: until.toISOString(), SubjectConfirmationDataNotOnOrAfter: until.toISOString(), NameIDFormat: EMAIL,
        NameID: identity.email, InResponseTo: request.requestId, AttributeStatement: "",
        AuthnInstant: identity.authenticatedAt.toISOString(), SessionIndex: `_${randomUUID()}`,
      }) }),
    });
    return { samlResponse: response.context, acsUrl: config.acsUrl, relayState: request.relayState, expiresAt: until.toISOString() };
  }
  return { metadata: () => publicMetadata.getMetadata(), prepare, respond };
}
