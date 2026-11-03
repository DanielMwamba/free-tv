import { createXmltvScanner, findProgrammes, nowAndNext, type GuideData, type GuideEntry } from "./epg";
import { assertAllowedDestination, type UpstreamRequest } from "./stream-relay";

type GuideStoreOptions = {
  requestUpstream: UpstreamRequest;
  now?: () => number;
  ttlMs?: number;
  failureTtlMs?: number;
  windowMs?: number;
  timeoutMs?: number;
  maxChars?: number;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 3;
const EMPTY_GUIDE: GuideData = { keys: new Map(), programmes: new Map() };

/**
 * Guides XMLTV par pays, téléchargés à la demande puis gardés en mémoire. Seuls les programmes
 * de la fenêtre à venir sont conservés ; un échec est mémorisé quelques minutes pour ne pas
 * relancer le téléchargement à chaque requête.
 */
export function createGuideStore({
  requestUpstream,
  now = Date.now,
  ttlMs = 60 * 60 * 1000,
  failureTtlMs = 10 * 60 * 1000,
  windowMs = 12 * 60 * 60 * 1000,
  timeoutMs = 60_000,
  maxChars = 200_000_000,
}: GuideStoreOptions) {
  const cache = new Map<string, { expiresAt: number; data: Promise<GuideData> }>();

  async function download(url: string): Promise<GuideData> {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = new URL(url);
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      assertAllowedDestination(current);
      if (current.protocol !== "https:") throw new Error("Guide non chiffré refusé.");
      const response = await requestUpstream(current, { Accept: "application/gzip, */*", "User-Agent": "Mozilla/5.0 FREE-TV/0.1" }, signal);
      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        await response.body?.cancel().catch(() => undefined);
        current = new URL(location, current);
        continue;
      }
      if (!response.ok || !response.body) throw new Error(`Guide indisponible (${response.status}).`);

      const startedAt = now();
      const scanner = createXmltvScanner({ from: startedAt, until: startedAt + windowMs });
      const reader = response.body
        .pipeThrough(new DecompressionStream("gzip") as unknown as ReadableWritablePair<BufferSource, Uint8Array>)
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > maxChars) throw new Error("Guide trop volumineux.");
          scanner.push(value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
      return scanner.result();
    }
    throw new Error("Trop de redirections.");
  }

  function load(url: string) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > now()) return cached.data;
    const entry = { expiresAt: now() + ttlMs, data: download(url) };
    entry.data = entry.data.catch(() => {
      entry.expiresAt = now() + failureTtlMs;
      return EMPTY_GUIDE;
    });
    cache.set(url, entry);
    return entry.data;
  }

  return {
    async lookup(url: string, tvgId: string, name: string): Promise<GuideEntry> {
      const guide = await load(url);
      return nowAndNext(findProgrammes(guide, tvgId, name), now());
    },
  };
}
