import { createHash, createHmac } from "node:crypto";
import type { PutObjectRequest, StoragePort } from "../port.js";

/**
 * Adaptateur S3 (MinIO en local, S3 compatible en production). Signature AWS Signature Version 4
 * calculée ici avec node:crypto : aucun kit vendeur n'entre dans l'arbre de dépendances de l'API.
 *
 * Règles tenues par cet adaptateur :
 * - chiffrement côté serveur imposé à l'écriture (SSE-S3, en-tête x-amz-server-side-encryption) ;
 * - aucune URL publique : les URL pré-signées sont courtes et liées à la session (voir presignedGetUrl) ;
 * - la classification du contenu voyage en métadonnée d'objet, pour l'inventaire et la purge.
 */
export interface S3Config {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  /** MinIO n'accepte que le style chemin (http://hote/bucket/cle). */
  forcePathStyle?: boolean;
}

const SERVICE = "s3";
const UNSIGNED = "UNSIGNED-PAYLOAD";

const sha256Hex = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

/** RFC 3986 : S3 exige que chaque segment de clé soit encodé, la barre oblique restant un séparateur. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

function stamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = `${now.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function signingKey(secretKey: string, dateStamp: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), SERVICE), "aws4_request");
}

export function createS3Adapter(config: S3Config): StoragePort {
  const base = config.endpoint.replace(/\/$/, "");
  const host = new URL(base).host;

  function url(bucket: string, key: string): string {
    return config.forcePathStyle === false ? `${base.replace(host, `${bucket}.${host}`)}/${encodeKey(key)}` : `${base}/${bucket}/${encodeKey(key)}`;
  }
  function canonicalPath(bucket: string, key: string): string {
    return config.forcePathStyle === false ? `/${encodeKey(key)}` : `/${bucket}/${encodeKey(key)}`;
  }

  /** Signature d'une requête (en-tête Authorization), payload haché. */
  async function signedFetch(method: string, bucket: string, key: string, body?: Uint8Array, extraHeaders: Record<string, string> = {}): Promise<Response> {
    const now = new Date();
    const { amzDate, dateStamp } = stamps(now);
    const payloadHash = sha256Hex(body ?? new Uint8Array());
    const headers: Record<string, string> = { host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, ...extraHeaders };
    const signedHeaderNames = Object.keys(headers)
      .map((h) => h.toLowerCase())
      .sort();
    const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${String(headers[Object.keys(headers).find((k) => k.toLowerCase() === h) as string]).trim()}\n`).join("");
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalRequest = [method, canonicalPath(bucket, key), "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = hmac(signingKey(config.secretKey, dateStamp, config.region), stringToSign).toString("hex");
    headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const init: RequestInit = body ? { method, headers, body: Buffer.from(body) } : { method, headers };
    return fetch(url(bucket, key), init);
  }

  return {
    async put(req: PutObjectRequest): Promise<{ versionId: string; sha256: string }> {
      const digest = sha256Hex(req.body);
      const res = await signedFetch("PUT", req.bucket, req.key, req.body, {
        "content-type": req.contentType,
        "x-amz-server-side-encryption": "AES256",
        "x-amz-meta-classification": req.classification,
      });
      if (!res.ok) throw new Error(`Écriture objet refusée (${res.status}) : ${await res.text()}`);
      return { versionId: res.headers.get("x-amz-version-id") ?? digest, sha256: digest };
    },

    async get(bucket: string, key: string): Promise<Uint8Array> {
      const res = await signedFetch("GET", bucket, key);
      if (!res.ok) throw new Error(`Lecture objet refusée (${res.status})`);
      return new Uint8Array(await res.arrayBuffer());
    },

    /**
     * URL pré-signée courte. sessionBinding entre dans la signature via un en-tête signé :
     * l'URL est donc inutilisable en dehors de la session qui l'a demandée, et expire avec elle.
     * L'application ne sert jamais cette URL au navigateur en V1 : les pièces transitent par l'API.
     */
    presignedGetUrl(bucket: string, key: string, ttlSeconds: number, sessionBinding: string): Promise<string> {
      const now = new Date();
      const { amzDate, dateStamp } = stamps(now);
      const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
      const signedHeaders = "host;x-amz-meta-session";
      const query = new URLSearchParams({
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${config.accessKey}/${scope}`,
        "X-Amz-Date": amzDate,
        "X-Amz-Expires": String(Math.min(ttlSeconds, 60)),
        "X-Amz-SignedHeaders": signedHeaders,
      });
      const canonicalRequest = [
        "GET",
        canonicalPath(bucket, key),
        query.toString(),
        `host:${host}\nx-amz-meta-session:${sessionBinding}\n`,
        signedHeaders,
        UNSIGNED,
      ].join("\n");
      const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
      const signature = hmac(signingKey(config.secretKey, dateStamp, config.region), stringToSign).toString("hex");
      query.set("X-Amz-Signature", signature);
      return Promise.resolve(`${url(bucket, key)}?${query.toString()}`);
    },

    async delete(bucket: string, key: string): Promise<void> {
      const res = await signedFetch("DELETE", bucket, key);
      if (!res.ok && res.status !== 404) throw new Error(`Suppression objet refusée (${res.status})`);
    },
  };
}
