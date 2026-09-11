import { StateBanner } from "@dealpme/ui";

/**
 * Page introuvable. Le message reste volontairement neutre : une ressource hors de votre périmètre
 * répond la même chose qu'une ressource inexistante, sans quoi la page confirmerait son existence.
 */
export default function NotFound() {
  return (
    <div className="dp-stack" style={{ maxWidth: 640 }}>
      <h1>Page introuvable</h1>
      <StateBanner tone="info" title="Rien à cette adresse" controlId="APP_NOT_FOUND">
        <p style={{ marginTop: 4 }}>
          Cette page n'existe pas, ou son contenu ne relève pas de votre compte. Les deux cas donnent la même
          réponse : c'est volontaire.
        </p>
      </StateBanner>
      <div className="dp-actions">
        <a className="dp-btn dp-btn-primary" href="/" data-control-id="APP_NOT_FOUND_HOME">
          Revenir à l'accueil
        </a>
        <a className="dp-btn dp-btn-secondary" href="/opportunites" data-control-id="APP_NOT_FOUND_OPPS">
          Voir les opportunités
        </a>
      </div>
    </div>
  );
}
