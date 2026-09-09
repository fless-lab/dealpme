# ADR 0004 : TypeScript de bout en bout

Date : 09/09/2026. Statut : accepté.

## Contexte

Le mapping React de la Tranche 3 du design system fournit déjà un contrat de composants. L'équipe reste à recruter
en Afrique francophone, où les profils JavaScript / TypeScript sont les plus disponibles. Cinq semaines pour V1.

## Décision

NestJS pour l'API et le RPS, Next.js pour le web, Drizzle sur PostgreSQL, bibliothèques partagées en TypeScript.
Seul DealLens (V5) est en Python, pour l'écosystème IA et documentaire.

## Conséquences

- Un langage, un outillage, un registre de types partagé (`@dealpme/domain`, `@dealpme/contracts`).
- Les règles métier critiques vivent dans `@dealpme/rules`, sans I/O, testées en quelques millisecondes.
- Node 24 ; paquets compilés en CommonJS pour rester consommables par NestJS et Next.js sans configuration exotique.
