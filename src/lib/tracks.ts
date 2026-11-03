export type TrackOption = { value: number; label: string };

type LevelLike = { height?: number; bitrate?: number };
type AudioTrackLike = { name?: string; lang?: string };

export const AUTO_LEVEL = -1;

function levelLabel(level: LevelLike) {
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kb/s`;
  return null;
}

/**
 * Qualités proposées pour un flux HLS : « Auto » puis les définitions de la plus haute à la plus
 * basse. Deux variantes de même définition ne gardent que le débit le plus élevé. Aucun choix
 * n'est proposé quand le flux n'a qu'une seule qualité.
 */
export function qualityOptions(levels: readonly LevelLike[]): TrackOption[] {
  const sorted = levels
    .map((level, index) => ({ index, label: levelLabel(level), height: level.height ?? 0, bitrate: level.bitrate ?? 0 }))
    .filter((level): level is typeof level & { label: string } => level.label !== null)
    .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);

  const seen = new Set<string>();
  const options: TrackOption[] = [];
  for (const level of sorted) {
    if (seen.has(level.label)) continue;
    seen.add(level.label);
    options.push({ value: level.index, label: level.label });
  }
  return options.length > 1 ? [{ value: AUTO_LEVEL, label: "Auto" }, ...options] : [];
}

function languageName(lang: string) {
  try {
    const name = new Intl.DisplayNames(["fr"], { type: "language" }).of(lang);
    return name && name !== lang ? name.charAt(0).toUpperCase() + name.slice(1) : null;
  } catch {
    return null;
  }
}

/** Pistes audio nommées d'après le manifeste, sinon d'après leur langue. */
export function audioOptions(tracks: readonly AudioTrackLike[]): TrackOption[] {
  if (tracks.length < 2) return [];
  return tracks.map((track, index) => ({
    value: index,
    label: track.name?.trim() || (track.lang && languageName(track.lang)) || `Piste ${index + 1}`,
  }));
}
