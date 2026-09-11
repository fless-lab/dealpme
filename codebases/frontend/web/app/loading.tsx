import { Skeleton } from "@dealpme/ui";

/**
 * État de chargement par défaut. Sans lui, une page servie par le serveur laisse l'écran figé sur la page
 * précédente : l'utilisateur ne sait pas si son clic a été pris en compte.
 */
export default function Loading() {
  return (
    <div className="dp-stack" aria-busy="true" aria-live="polite">
      <p className="dp-muted">Chargement en cours.</p>
      <Skeleton lines={5} />
    </div>
  );
}
