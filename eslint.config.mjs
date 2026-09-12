import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

const sources = ["packages/**/*.{ts,tsx}", "codebases/**/*.{ts,tsx}"];
const frontend = ["codebases/frontend/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**", "**/out/**",
      "ressources/**", "design/**", "backups/**", ".ci-artifacts/**", "**/next-env.d.ts"],
  },
  {
    files: sources,
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-console": "error",
    },
  },
  {
    files: frontend,
    extends: [react.configs.flat.recommended, react.configs.flat["jsx-runtime"]],
    languageOptions: { globals: globals.browser },
    settings: { react: { version: "detect" } },
    plugins: { "react-hooks": hooks },
    rules: {
      // TypeScript porte les contrats de props ; les règles de Hooks s'appliquent
      // aussi au design system sans imposer les diagnostics optionnels du React Compiler.
      "react/prop-types": "off",
      // Apostrophes et guillemets sont du texte JSX valide en français. Conserver
      // la détection des caractères qui peuvent masquer une fermeture de balise.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["codebases/frontend/web/**/*.{ts,tsx}"],
    plugins: { "@next/next": next },
    settings: { next: { rootDir: "codebases/frontend/web/" } },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      // Le produit emploie aussi des ancres HTML natives (navigation avec session
      // serveur). Leur migration vers Link est un choix UX, pas une erreur de code.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["codebases/backend/api/src/seed/seed.ts"],
    // Commande CLI : sa progression est destinée au terminal, pas aux logs HTTP.
    rules: { "no-console": "off" },
  },
  {
    files: ["devX/**/*.mjs", "eslint.config.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
);
