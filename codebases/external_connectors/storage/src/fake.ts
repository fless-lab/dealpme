import { createHash, randomUUID } from "node:crypto";
import type { PutObjectRequest, StoragePort } from "./port.js";

/**
 * Stockage en mémoire pour les tests. Il tient les mêmes promesses que l'adaptateur réel sur ce qui
 * compte pour les tests : empreinte sha256, identifiant de version par écriture, aucune URL publique
 * (l'URL pré-signée est opaque, courte et liée à la session). Ne jamais l'activer en production.
 */
export interface FakeStorage extends StoragePort {
  readonly objects: Map<string, { body: Uint8Array; contentType: string; classification: string; versionId: string }>;
}

export function createFakeStorage(): FakeStorage {
  const objects = new Map<string, { body: Uint8Array; contentType: string; classification: string; versionId: string }>();
  const at = (bucket: string, key: string) => `${bucket}/${key}`;

  return {
    objects,
    put(req: PutObjectRequest) {
      const versionId = randomUUID();
      objects.set(at(req.bucket, req.key), { body: req.body, contentType: req.contentType, classification: req.classification, versionId });
      return Promise.resolve({ versionId, sha256: createHash("sha256").update(req.body).digest("hex") });
    },
    get(bucket: string, key: string) {
      const found = objects.get(at(bucket, key));
      if (!found) return Promise.reject(new Error(`Objet absent : ${at(bucket, key)}`));
      return Promise.resolve(found.body);
    },
    presignedGetUrl(bucket: string, key: string, ttlSeconds: number, sessionBinding: string) {
      const expires = Date.now() + Math.min(ttlSeconds, 60) * 1000;
      const token = createHash("sha256").update(`${at(bucket, key)}:${expires}:${sessionBinding}`).digest("hex");
      return Promise.resolve(`memory://${at(bucket, key)}?expires=${expires}&token=${token}`);
    },
    delete(bucket: string, key: string) {
      objects.delete(at(bucket, key));
      return Promise.resolve();
    },
  };
}
