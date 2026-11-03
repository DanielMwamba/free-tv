import { classifyProbe, type ChannelHealth, type HealthReport } from "./health-report";
import { assertAllowedDestination, type UpstreamRequest } from "./stream-relay";

export type HealthTarget = { id: string; url: string };

type HealthCheckerOptions = {
  loadTargets: () => Promise<HealthTarget[]>;
  requestUpstream: UpstreamRequest;
  now?: () => number;
  concurrency?: number;
  timeoutMs?: number;
  ttlMs?: number;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 4;
const PEEK_BYTES = 512;

async function readStart(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < PEEK_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
    }
  } finally {
    // On n'a besoin que de l'en-tête du manifeste : inutile de télécharger la suite.
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).subarray(0, PEEK_BYTES).toString("utf8");
}

/**
 * Contrôle périodique des flux HLS du catalogue. Le contrôle tourne en arrière-plan :
 * chaque appel renvoie l'état connu et relance un contrôle si le précédent a expiré.
 */
export function createHealthChecker({
  loadTargets,
  requestUpstream,
  now = Date.now,
  concurrency = 32,
  timeoutMs = 8_000,
  ttlMs = 60 * 60 * 1000,
}: HealthCheckerOptions) {
  let results: Record<string, ChannelHealth> = {};
  let partial: Record<string, ChannelHealth> = {};
  let checkedAt: number | null = null;
  let running: Promise<void> | null = null;
  let checked = 0;
  let total = 0;

  async function probe(target: HealthTarget): Promise<ChannelHealth> {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      let current = new URL(target.url);
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        assertAllowedDestination(current);
        const response = await requestUpstream(
          current,
          {
            Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
            "User-Agent": "Mozilla/5.0 FREE-TV/0.1",
          },
          signal,
        );
        const location = response.headers.get("location");
        if (REDIRECT_STATUSES.has(response.status) && location) {
          await response.body?.cancel().catch(() => undefined);
          current = new URL(location, current);
          continue;
        }
        return classifyProbe(response.status, await readStart(response));
      }
      return "offline";
    } catch {
      return "offline";
    }
  }

  async function run() {
    const targets = await loadTargets();
    const next: Record<string, ChannelHealth> = {};
    partial = next;
    checked = 0;
    total = targets.length;
    let cursor = 0;

    const worker = async () => {
      while (cursor < targets.length) {
        const target = targets[cursor];
        cursor += 1;
        next[target.id] = await probe(target);
        checked += 1;
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    results = next;
    partial = {};
    checkedAt = now();
  }

  function report(): HealthReport {
    return {
      checkedAt: checkedAt === null ? null : new Date(checkedAt).toISOString(),
      running: running !== null,
      checked,
      total,
      // Pendant un contrôle, les nouveaux résultats remplacent progressivement les anciens.
      results: running ? { ...results, ...partial } : results,
    };
  }

  function refresh() {
    const isFresh = checkedAt !== null && now() - checkedAt < ttlMs;
    if (!running && !isFresh) {
      running = run()
        .catch(() => undefined)
        .finally(() => {
          running = null;
        });
    }
    return running;
  }

  return {
    /** État connu, sans attendre la fin d'un contrôle en cours. */
    snapshot() {
      void refresh();
      return report();
    },
    /** Attend la fin du contrôle en cours (utile aux tests). */
    async settle() {
      await refresh();
      return report();
    },
  };
}
