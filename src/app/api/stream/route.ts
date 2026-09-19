import { lookup } from "node:dns/promises";

import { NextRequest } from "next/server";

import { getChannels } from "@/lib/channels";
import { isPrivateAddress, rewriteHlsManifest } from "@/lib/hls-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trustedHosts = new Set<string>();
let seedPromise: Promise<void> | null = null;

async function seedTrustedHosts() {
  seedPromise ??= getChannels().then((channels) => {
    channels.forEach((channel) => trustedHosts.add(new URL(channel.url).hostname.toLowerCase()));
  });
  return seedPromise;
}

async function assertPublicDestination(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocole non autorisé.");
  if (url.username || url.password) throw new Error("Identifiants dans l’URL non autorisés.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Port non autorisé.");

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Destination locale interdite.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Destination privée interdite.");
  }
}

async function fetchUpstream(initialUrl: URL, range: string | null) {
  let current = initialUrl;

  for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
    await assertPublicDestination(current);
    const response = await fetch(current, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, video/*, audio/*, */*",
        ...(range ? { Range: range } : {}),
        Origin: current.origin,
        Referer: `${current.origin}/`,
        "User-Agent": "Mozilla/5.0 FREE-TV/0.1",
      },
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, finalUrl: current };

    const location = response.headers.get("location");
    if (!location) throw new Error("Redirection sans destination.");
    current = new URL(location, current);
    trustedHosts.add(current.hostname.toLowerCase());
  }

  throw new Error("Trop de redirections du diffuseur.");
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return new Response("URL de flux manquante.", { status: 400 });

  let target: URL;
  try {
    target = new URL(value);
    await seedTrustedHosts();
    if (!trustedHosts.has(target.hostname.toLowerCase())) {
      return new Response("Hôte absent du catalogue de chaînes.", { status: 403 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "URL invalide.";
    return new Response(message, { status: 400 });
  }

  try {
    const { response, finalUrl } = await fetchUpstream(target, request.headers.get("range"));
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

    for (const name of ["content-range", "accept-ranges", "content-length"]) {
      const header = response.headers.get(name);
      if (header && !isManifest) headers.set(name, header);
    }

    if (isManifest) {
      const manifest = await response.text();
      if (manifest.length > 2_000_000) return new Response("Manifeste trop volumineux.", { status: 413 });
      const rewritten = rewriteHlsManifest(manifest, finalUrl.toString(), (resource) => {
        trustedHosts.add(resource.hostname.toLowerCase());
      });
      return new Response(rewritten, { status: response.status, headers });
    }

    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Relais indisponible.";
    return new Response(`Impossible de relayer ce flux. ${message}`, { status: 502 });
  }
}
