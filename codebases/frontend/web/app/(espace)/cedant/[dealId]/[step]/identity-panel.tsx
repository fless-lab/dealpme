import { Panel, StateBanner } from "@dealpme/ui";
import type { Dossier } from "../../../../../lib/dossier";

/** Identité du dossier : fixée à la création, non modifiable. L'écran explique pourquoi plutôt que de griser un champ. */
export function IdentityPanel({ dossier }: { dossier: Dossier }) {
  const isShare = dossier.dealType === "SHARE_DEAL";
  return (
    <>
      <Panel title="Nature de l'opération" controlId="SELLER_IDENTITY">
        <dl className="dp-deflist">
          <dt className="dp-label">Type de cession</dt>
          <dd>{isShare ? "Cession de titres (actions ou parts sociales)" : "Cession d'actifs (fonds de commerce, matériel, contrats)"}</dd>
          <dt className="dp-label">État du dossier</dt>
          <dd>{dossier.status === "DRAFT" ? "En préparation" : "Soumis à vérification"}</dd>
        </dl>
        <p className="dp-muted" style={{ marginBottom: 0 }}>
          Le type de cession a été fixé à la création et ne peut plus changer : il commande les pièces attendues et le
          régime de diffusion. Pour changer de nature d'opération, il faut ouvrir un autre dossier.
        </p>
      </Panel>
      {isShare ? (
        <StateBanner tone="warning" title="Diffusion limitée au cercle restreint" controlId="SELLER_IDENTITY_SHARE">
          Une cession de titres ne se propose pas au public. La plateforme refuse la publication ouverte de ce dossier :
          seuls des repreneurs admis un par un par le service de conformité pourront en connaître le détail.
        </StateBanner>
      ) : null}
    </>
  );
}
