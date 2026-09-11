import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@dealpme/ui", "@dealpme/domain", "@dealpme/contracts", "@dealpme/i18n", "@dealpme/rules"],
  async headers() {
    return [
      {
        // Aucune page d'une cession de titres n'est indexable ; la règle est appliquée par en-tête, pas seulement par balise.
        source: "/opportunites/titres/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
    ];
  },
};

export default nextConfig;
