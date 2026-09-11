"use client";

import { useEffect } from "react";
import { Actions, Button, StateBanner } from "@dealpme/ui";

/**
 * Écran d'erreur. Il dit ce qui s'est passé, ce que la personne peut faire, et donne la référence
 * technique qui permet à l'équipe de retrouver la requête dans les journaux. Jamais de trace d'exécution
 * à l'écran : elle ne sert à personne ici et renseigne un attaquant.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // La console du navigateur garde la trace pour un développeur qui a l'écran sous les yeux.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="dp-stack" style={{ maxWidth: 640 }}>
      <h1>Cette page n'a pas pu s'afficher</h1>
      <StateBanner tone="danger" title="Une erreur est survenue" controlId="APP_ERROR">
        <p style={{ marginTop: 4 }}>
          Le problème vient de notre côté, pas de votre saisie. Réessayez dans un instant ; si cela se reproduit,
          signalez-le en indiquant la référence ci-dessous.
        </p>
        {error.digest ? (
          <p className="dp-muted" style={{ marginBottom: 0 }}>
            Référence technique : <code>{error.digest}</code>
          </p>
        ) : null}
      </StateBanner>
      <Actions>
        <Button controlId="APP_ERROR_RETRY" onClick={reset}>
          Réessayer
        </Button>
        <a className="dp-btn dp-btn-secondary" href="/" data-control-id="APP_ERROR_HOME">
          Revenir à l'accueil
        </a>
      </Actions>
    </div>
  );
}
