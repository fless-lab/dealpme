import { v7 as uuidv7, validate } from "uuid";

/** Identifiants UUIDv7 (ordonnables dans le temps) pour toutes les clés primaires (convention v0, section 9). */
export type Id = string & { readonly __brand: "Id" };

export function newId(): Id {
  return uuidv7() as Id;
}

export function isId(value: unknown): value is Id {
  return typeof value === "string" && validate(value);
}

export function assertId(value: unknown, label = "identifiant"): Id {
  if (!isId(value)) {
    throw new TypeError(`${label} invalide`);
  }
  return value;
}
