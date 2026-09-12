import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Registre des contrôles d'interface. Le standard d'implémentation exige que chaque contrôle visible porte
 * un identifiant présent au registre, et le Release Gate en fait une condition bloquante
 * (UNREGISTERED_CONTROL, P0). La règle figurait dans nos conventions depuis le premier jour, mais elle
 * désignait un registre qui n'existait pas et que rien ne vérifiait : 376 identifiants ont dérivé sans
 * qu'aucun contrôle ne s'en aperçoive. Ce test rend la règle exécutable.
 *
 * Il produit aussi `qa/control-coverage.json`, l'une des quatre preuves de recette attendues.
 */
const RACINE = join(__dirname, "..", "..", "..", "..");
const REGISTRE = join(RACINE, "qa", "registre-interactions.json");
const SOURCES = [join(RACINE, "codebases", "frontend", "web", "app"), join(RACINE, "codebases", "frontend", "ui", "src")];

interface Controle {
  origine: "corpus" | "depot";
  surface: string;
  contrat?: string;
  utilise: boolean;
}

interface Registre {
  controles: Record<string, Controle>;
}

function fichiers(dossier: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiers(chemin));
    else if (chemin.endsWith(".tsx") || chemin.endsWith(".ts")) out.push(chemin);
  }
  return out;
}

const STATIQUE = /(?:controlId|data-control-id)=[{"]\s*"?([A-Z][A-Z0-9_]{2,})"?|controlId:\s*"([A-Z][A-Z0-9_]{2,})"/g;
/** Identifiant assemblé à l'exécution : non énumérable, donc invérifiable par la preuve de couverture. */
const DYNAMIQUE = /(?:controlId|data-control-id)=\{`[^`]*\$\{/g;

function releverIdentifiants(): { utilises: Map<string, string>; dynamiques: string[] } {
  const utilises = new Map<string, string>();
  const dynamiques: string[] = [];
  for (const source of SOURCES) {
    for (const fichier of fichiers(source)) {
      const texte = readFileSync(fichier, "utf8");
      for (const m of texte.matchAll(STATIQUE)) {
        const id = m[1] ?? m[2];
        if (id && !utilises.has(id)) utilises.set(id, relative(RACINE, fichier));
      }
      if (DYNAMIQUE.test(texte)) dynamiques.push(relative(RACINE, fichier));
      DYNAMIQUE.lastIndex = 0;
    }
  }
  return { utilises, dynamiques };
}

const registre = JSON.parse(readFileSync(REGISTRE, "utf8")) as Registre;
const { utilises, dynamiques } = releverIdentifiants();

describe("registre des contrôles d'interface", () => {
  it("n'accepte aucun identifiant absent du registre", () => {
    const inconnus = [...utilises.entries()].filter(([id]) => !registre.controles[id]).map(([id, f]) => `${id} (${f})`);
    expect(inconnus, `identifiants hors registre : ${inconnus.join(", ")}`).toEqual([]);
  });

  it("ne laisse pas d'entrée du dépôt sans contrôle correspondant dans le code", () => {
    const orphelines = Object.entries(registre.controles)
      .filter(([id, c]) => c.origine === "depot" && !utilises.has(id))
      .map(([id]) => id);
    expect(orphelines, `entrées du dépôt sans contrôle : ${orphelines.join(", ")}`).toEqual([]);
  });

  it("reprend les identifiants du corpus sur les surfaces qu'il couvre", () => {
    // Seuil de non-régression : la conformité ne doit pas diminuer. Elle augmentera avec la décision A15.
    const conformes = [...utilises.keys()].filter((id) => registre.controles[id]?.origine === "corpus");
    expect(conformes.length).toBeGreaterThanOrEqual(4);
  });

  it("n'introduit pas de nouvel identifiant assemblé à l'exécution", () => {
    // Deux fichiers en portent déjà : ils sont connus et inscrits au classeur. Aucun de plus.
    expect(dynamiques.length, `identifiants dynamiques : ${dynamiques.join(", ")}`).toBeLessThanOrEqual(2);
  });

  it("produit la preuve de couverture attendue par le Release Gate", () => {
    const total = Object.keys(registre.controles).length;
    const duCorpus = Object.values(registre.controles).filter((c) => c.origine === "corpus").length;
    const aDocumenter = Object.values(registre.controles).filter((c) => c.contrat === "a_documenter").length;
    const couverture = {
      genereLe: new Date().toISOString().slice(0, 10),
      controlesAuRegistre: total,
      controlesDuCorpus: duCorpus,
      controlesDuDepot: total - duCorpus,
      controlesUtilisesDansLeCode: utilises.size,
      identifiantsHorsRegistre: [...utilises.keys()].filter((id) => !registre.controles[id]).length,
      contratsADocumenter: aDocumenter,
      identifiantsDynamiques: dynamiques.length,
      statut: [...utilises.keys()].every((id) => registre.controles[id]) ? "PASS" : "FAIL",
    };
    writeFileSync(join(RACINE, "qa", "control-coverage.json"), `${JSON.stringify(couverture, null, 1)}\n`);
    expect(couverture.statut).toBe("PASS");
  });
});
