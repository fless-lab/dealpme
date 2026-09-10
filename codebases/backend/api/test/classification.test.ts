import { describe, expect, it } from "vitest";
import { getTableColumns, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as core from "../src/database/schema/core.js";
import { CLASSIFICATION, classOf, type DataClass } from "../src/database/classification.js";

/** Toutes les tables du schéma core, avec leur nom de variable, qui est la clé du registre. */
const TABLES: [string, PgTable][] = Object.entries(core).filter((e): e is [string, PgTable] => is(e[1], PgTable));

describe("registre de classification des données", () => {
  it("couvre chaque table du schéma", () => {
    const manquantes = TABLES.map(([name]) => name).filter((name) => !CLASSIFICATION[name]);
    expect(manquantes, `tables absentes du registre : ${manquantes.join(", ")}`).toEqual([]);
  });

  it("classe chaque colonne de chaque table", () => {
    const manquantes: string[] = [];
    for (const [name, table] of TABLES) {
      for (const column of Object.keys(getTableColumns(table))) {
        if (!classOf(name, column)) manquantes.push(`${name}.${column}`);
      }
    }
    expect(manquantes, `colonnes sans classification : ${manquantes.join(", ")}`).toEqual([]);
  });

  it("ne contient aucune entrée orpheline", () => {
    const orphelines: string[] = [];
    for (const [name, columns] of Object.entries(CLASSIFICATION)) {
      const table = TABLES.find(([n]) => n === name)?.[1];
      if (!table) {
        orphelines.push(`table ${name}`);
        continue;
      }
      const real = new Set(Object.keys(getTableColumns(table)));
      for (const column of Object.keys(columns)) {
        if (!real.has(column)) orphelines.push(`${name}.${column}`);
      }
    }
    expect(orphelines, `entrées du registre sans colonne : ${orphelines.join(", ")}`).toEqual([]);
  });

  it("classe en CONFIDENTIAL_DEAL toute colonne chiffrée au repos", () => {
    const fautives: string[] = [];
    for (const [name, table] of TABLES) {
      for (const column of Object.keys(getTableColumns(table))) {
        if (column.endsWith("Enc") && classOf(name, column) !== "CONFIDENTIAL_DEAL") fautives.push(`${name}.${column}`);
      }
    }
    expect(fautives, `colonnes chiffrées mal classées : ${fautives.join(", ")}`).toEqual([]);
  });

  it("classe les empreintes de secret en SENSITIVE_PERSONAL", () => {
    const attendues: [string, string][] = [
      ["users", "passwordHash"],
      ["sessions", "tokenHash"],
      ["otpChallenges", "codeHash"],
    ];
    for (const [table, column] of attendues) {
      expect(classOf(table, column), `${table}.${column}`).toBe<DataClass>("SENSITIVE_PERSONAL");
    }
  });

  it("ne classe PUBLIC que ce qui est diffusable au palier T0", () => {
    const publiques: string[] = [];
    for (const [table, columns] of Object.entries(CLASSIFICATION)) {
      for (const [column, cls] of Object.entries(columns)) {
        if (cls === "PUBLIC") publiques.push(`${table}.${column}`);
      }
    }
    // Le prix, la valorisation, l'identité de l'entreprise et les pièces ne sont jamais publics.
    const interdits = publiques.filter((p) => /price|valuation|legalName|rccm|storageKey|body|note/i.test(p));
    expect(interdits, `colonnes classées PUBLIC à tort : ${interdits.join(", ")}`).toEqual([]);
  });
});
