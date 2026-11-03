export type GuideProgramme = { title: string; start: number; stop: number };
export type GuideEntry = { now: GuideProgramme | null; next: GuideProgramme | null };

const GUIDE_FILE_PATTERN = /^https:\/\/epgshare01\.online\/epgshare01\/epg_ripper_([A-Z]{2})1\.xml\.gz$/;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Clé de comparaison : sans accents, casse ni ponctuation (« France.2..fr » = « France2.fr »). */
export function normalizeGuideKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Suffixe pays d'un identifiant XMLTV (« France2.fr » → « fr »). */
export function guideCountry(tvgId: string) {
  const match = /\.([a-z]{2})$/i.exec(tvgId.trim());
  return match ? match[1].toLowerCase() : null;
}

/**
 * Guides par pays annoncés dans l'en-tête `x-tvg-url` de la playlist. Seuls les fichiers
 * nationaux d'epgshare01 en HTTPS sont retenus : l'en-tête vient d'une source tierce.
 */
export function parseGuideUrls(header: string): Map<string, string> {
  const match = /x-tvg-url="([^"]*)"/.exec(header);
  const guides = new Map<string, string>();
  for (const candidate of match?.[1].split(",") ?? []) {
    const url = candidate.trim();
    const country = GUIDE_FILE_PATTERN.exec(url)?.[1];
    if (country) guides.set(country.toLowerCase(), url);
  }
  return guides;
}

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? entity;
    const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
  });
}

/** Horodatage XMLTV (« 20261103050000 +0100 ») en millisecondes. */
export function parseXmltvTime(value: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second, sign, offsetHours, offsetMinutes] = match;
  const utc = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const offset = sign ? (sign === "-" ? -1 : 1) * (+offsetHours * 60 + +offsetMinutes) * 60_000 : 0;
  return utc - offset;
}

function attribute(tag: string, name: string) {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? decodeEntities(match[1]) : null;
}

type ScannerOptions = { from: number; until: number };

/**
 * Lecture progressive d'un fichier XMLTV : on lui passe le texte par morceaux et il ne garde
 * que les programmes qui chevauchent la fenêtre demandée, pour borner la mémoire.
 */
export function createXmltvScanner({ from, until }: ScannerOptions) {
  let buffer = "";
  const keys = new Map<string, string>();
  const programmes = new Map<string, GuideProgramme[]>();

  function readChannel(element: string) {
    const id = attribute(element, "id");
    if (!id) return;
    const country = guideCountry(id) ?? "";
    keys.set(normalizeGuideKey(id), id);
    for (const match of element.matchAll(/<display-name[^>]*>([^<]*)<\/display-name>/g)) {
      const key = normalizeGuideKey(decodeEntities(match[1])) + country;
      if (!keys.has(key)) keys.set(key, id);
    }
  }

  function readProgramme(element: string) {
    const channel = attribute(element, "channel");
    const start = parseXmltvTime(attribute(element, "start") ?? "");
    const stop = parseXmltvTime(attribute(element, "stop") ?? "");
    if (!channel || start === null || stop === null || stop <= from || start >= until || stop <= start) return;
    const title = /<title[^>]*>([^<]*)<\/title>/.exec(element)?.[1];
    if (!title) return;
    const list = programmes.get(channel) ?? [];
    list.push({ title: decodeEntities(title).trim(), start, stop });
    programmes.set(channel, list);
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      let cursor = 0;
      while (true) {
        const channelAt = buffer.indexOf("<channel ", cursor);
        const programmeAt = buffer.indexOf("<programme ", cursor);
        const isChannel = channelAt !== -1 && (programmeAt === -1 || channelAt < programmeAt);
        const start = isChannel ? channelAt : programmeAt;
        if (start === -1) {
          // Garde une fin de tampon qui pourrait contenir le début d'une balise coupée.
          cursor = Math.max(cursor, buffer.length - 16);
          break;
        }
        const closing = isChannel ? "</channel>" : "</programme>";
        const end = buffer.indexOf(closing, start);
        if (end === -1) {
          cursor = start;
          break;
        }
        const element = buffer.slice(start, end + closing.length);
        if (isChannel) readChannel(element);
        else readProgramme(element);
        cursor = end + closing.length;
      }
      buffer = buffer.slice(cursor);
    },
    result() {
      for (const list of programmes.values()) list.sort((a, b) => a.start - b.start);
      return { keys, programmes };
    },
  };
}

export type GuideData = ReturnType<ReturnType<typeof createXmltvScanner>["result"]>;

/** Programmes d'une chaîne du catalogue, retrouvée par son identifiant puis par son nom. */
export function findProgrammes(guide: GuideData, tvgId: string, name: string) {
  const country = guideCountry(tvgId) ?? "";
  for (const key of [normalizeGuideKey(tvgId), normalizeGuideKey(name) + country]) {
    const id = guide.keys.get(key);
    const list = id ? guide.programmes.get(id) : undefined;
    if (list?.length) return list;
  }
  return [];
}

export function nowAndNext(programmes: readonly GuideProgramme[], now: number): GuideEntry {
  const current = programmes.find((programme) => programme.start <= now && now < programme.stop) ?? null;
  // Les guides agrègent plusieurs sources : un même programme peut apparaître en double.
  const after = current ? current.stop : now;
  return { now: current, next: programmes.find((programme) => programme.start >= after && programme.start > now) ?? null };
}

/** Avancement d'un programme entre 0 et 1. */
export function programmeProgress(programme: GuideProgramme, now: number) {
  return Math.min(1, Math.max(0, (now - programme.start) / (programme.stop - programme.start)));
}
