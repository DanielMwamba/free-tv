export const FAVORITES_KEY = "freetv:favorites";
export const RECENTS_KEY = "freetv:recents";
export const MAX_RECENTS = 12;

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function pushRecent(ids: readonly string[], id: string, max = MAX_RECENTS): string[] {
  return [id, ...ids.filter((item) => item !== id)].slice(0, max);
}

// Le stockage local peut être absent, plein ou corrompu : toute anomalie donne une liste vide.
export function readIds(storage: KeyValueStorage | undefined, key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeIds(storage: KeyValueStorage | undefined, key: string, ids: readonly string[]) {
  try {
    storage?.setItem(key, JSON.stringify(ids));
  } catch {
    // Mode privé ou quota dépassé : la liste reste valable pour la session en cours.
  }
}
