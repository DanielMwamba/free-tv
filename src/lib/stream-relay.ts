import { isIP } from "node:net";

import { isPrivateAddress, rewriteHlsManifest } from "./hls-proxy";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 4;
const MAX_MANIFEST_LENGTH = 2_000_000;

export type UpstreamRequest = (
  url: URL,
  headers: Record<string, string>,
  signal?: AbortSignal,
) => Promise<Response>;

export type StreamRelayOptions = {
  /** URL des chaînes du catalogue : leurs hôtes forment la liste d'autorisation initiale. */
  loadCatalogueUrls: () => Promise<string[]>;
  /** Requête vers le diffuseur, sans suivi automatique des redirections. */
  requestUpstream: UpstreamRequest;
};

class RelayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function assertAllowedDestination(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new RelayError("Protocole non autorisé.", 400);
  if (url.username || url.password) {
    throw new RelayError("Identifiants dans l’URL non autorisés.", 400);
  }
  if (url.port && !["80", "443"].includes(url.port)) throw new RelayError("Port non autorisé.", 400);

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new RelayError("Destination locale interdite.", 403);
  }
  // Les adresses littérales ne passent pas par la résolution DNS : on les vérifie ici.
  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new RelayError("Destination privée interdite.", 403);
  }
}

export function createStreamRelay({ loadCatalogueUrls, requestUpstream }: StreamRelayOptions) {
  const trustedHosts = new Set<string>();
  let seedPromise: Promise<void> | null = null;

  function seedTrustedHosts() {
    seedPromise ??= loadCatalogueUrls()
      .then((urls) => {
        urls.forEach((url) => trustedHosts.add(new URL(url).hostname.toLowerCase()));
      })
      .catch((error: unknown) => {
        // Ne pas mémoriser l'échec : la requête suivante doit pouvoir recharger le catalogue.
        seedPromise = null;
        throw error;
      });
    return seedPromise;
  }

  async function fetchUpstream(initialUrl: URL, range: string | null, signal?: AbortSignal) {
    let current = initialUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      assertAllowedDestination(current);
      const response = await requestUpstream(
        current,
        {
          Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, video/*, audio/*, */*",
          ...(range ? { Range: range } : {}),
          Origin: current.origin,
          Referer: `${current.origin}/`,
          "User-Agent": "Mozilla/5.0 FREE-TV/0.1",
        },
        signal,
      );

      if (!REDIRECT_STATUSES.has(response.status)) return { response, finalUrl: current };

      const location = response.headers.get("location");
      if (!location) throw new RelayError("Redirection sans destination.", 502);
      current = new URL(location, current);
      trustedHosts.add(current.hostname.toLowerCase());
    }

    throw new RelayError("Trop de redirections du diffuseur.", 502);
  }

  async function relay(value: string | null, range: string | null, signal?: AbortSignal) {
    if (!value) return new Response("URL de flux manquante.", { status: 400 });

    let target: URL;
    try {
      target = new URL(value);
    } catch {
      return new Response("URL invalide.", { status: 400 });
    }

    try {
      await seedTrustedHosts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Catalogue indisponible.";
      return new Response(`Catalogue indisponible. ${message}`, { status: 503 });
    }

    if (!trustedHosts.has(target.hostname.toLowerCase())) {
      return new Response("Hôte absent du catalogue de chaînes.", { status: 403 });
    }

    try {
      const { response, finalUrl } = await fetchUpstream(target, range, signal);
      if (!response.ok && response.status !== 206) {
        return new Response(`Le diffuseur a répondu ${response.status}.`, { status: response.status });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const isManifest =
        /(?:mpegurl|m3u8)/i.test(contentType) || /\.m3u8(?:$|[?#])/i.test(finalUrl.toString());
      const headers = new Headers({
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": isManifest ? "no-store" : "public, max-age=60",
      });

      if (isManifest) {
        const manifest = await response.text();
        if (manifest.length > MAX_MANIFEST_LENGTH) {
          return new Response("Manifeste trop volumineux.", { status: 413 });
        }
        const rewritten = rewriteHlsManifest(manifest, finalUrl.toString(), (resource) => {
          trustedHosts.add(resource.hostname.toLowerCase());
        });
        return new Response(rewritten, { status: response.status, headers });
      }

      for (const name of ["content-range", "accept-ranges", "content-length"]) {
        const header = response.headers.get(name);
        if (header) headers.set(name, header);
      }
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (error instanceof RelayError) return new Response(error.message, { status: error.status });
      const message = error instanceof Error ? error.message : "Relais indisponible.";
      return new Response(`Impossible de relayer ce flux. ${message}`, { status: 502 });
    }
  }

  return { relay };
}
