export type PlaybackFailure = "geoblocked" | "error";

// 451 et 403 signalent un refus d'accès du diffuseur, le plus souvent régional.
// Sans statut (lecture HLS native), seules les chaînes marquées Ⓖ sont attribuées
// à la région.
export function classifyPlaybackFailure(status: number | undefined, isGeoBlocked: boolean): PlaybackFailure {
  if (status === 451 || status === 403) return "geoblocked";
  if (isGeoBlocked && status === undefined) return "geoblocked";
  return "error";
}
