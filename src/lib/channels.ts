export const PLAYLIST_URL =
  "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8";

export type ChannelKind = "hls" | "youtube" | "dailymotion" | "twitch" | "external";

export type Channel = {
  id: string;
  name: string;
  cleanName: string;
  url: string;
  logo: string | null;
  countryCode: string;
  country: string;
  group: string;
  channelNumber: string | null;
  kind: ChannelKind;
  isGeoBlocked: boolean;
  isSd: boolean;
  isSecure: boolean;
};

const COUNTRY_NAMES = new Intl.DisplayNames(["fr"], { type: "region" });
const ATTRIBUTE_PATTERN = /([\w-]+)="([^"]*)"/g;

export function isHostOf(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function getKind(url: string): ChannelKind {
  const hostname = safeHostname(url);

  if (/\.m3u8(?:$|[?#])/i.test(url)) return "hls";
  if (isHostOf(hostname, "youtube.com") || hostname === "youtu.be") return "youtube";
  if (isHostOf(hostname, "dailymotion.com") || hostname === "dai.ly") return "dailymotion";
  if (isHostOf(hostname, "twitch.tv")) return "twitch";
  return "external";
}

function safeHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function parseAttributes(line: string) {
  return Object.fromEntries(
    Array.from(line.matchAll(ATTRIBUTE_PATTERN), ([, key, value]) => [key, value]),
  );
}

function cleanDisplayName(name: string) {
  return name.replace(/[ⓈⒼⓎⓉⒹ]/gu, "").replace(/\s{2,}/g, " ").trim();
}

function countryName(code: string, fallback: string) {
  if (!code || code.length !== 2) return fallback || "International";

  try {
    return COUNTRY_NAMES.of(code.toUpperCase()) ?? fallback ?? code.toUpperCase();
  } catch {
    return fallback || code.toUpperCase();
  }
}

function makeId(attributes: Record<string, string>, url: string, index: number) {
  const stablePart = attributes["tvg-id"] || attributes["tvg-name"] || `${index}`;
  return `${stablePart}-${url}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function parsePlaylist(source: string): Channel[] {
  const lines = source.split(/\r?\n/);
  const channels: Channel[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line?.startsWith("#EXTINF:")) continue;

    const url = lines.slice(index + 1).find((candidate) => {
      const value = candidate.trim();
      return value.length > 0 && !value.startsWith("#");
    })?.trim();

    if (!url || !/^https?:\/\//i.test(url)) continue;

    const attributes = parseAttributes(line);
    const rawName = line.slice(line.lastIndexOf(",") + 1).trim();
    const name = rawName || attributes["tvg-name"] || "Chaîne sans nom";
    const group = attributes["group-title"] || "International";
    const countryCode = attributes["tvg-country"]?.split(";")[0]?.toUpperCase() || "";

    channels.push({
      id: makeId(attributes, url, channels.length),
      name,
      cleanName: cleanDisplayName(name),
      url,
      logo: attributes["tvg-logo"] || null,
      countryCode,
      country: countryName(countryCode, group),
      group,
      channelNumber: attributes["tvg-chno"] || null,
      kind: getKind(url),
      isGeoBlocked: name.includes("Ⓖ"),
      isSd: name.includes("Ⓢ"),
      isSecure: url.startsWith("https://"),
    });
  }

  return channels;
}

export async function getChannels() {
  const response = await fetch(PLAYLIST_URL, {
    next: { revalidate: 60 * 60 },
    headers: { Accept: "application/x-mpegURL, application/vnd.apple.mpegurl, text/plain" },
  });

  if (!response.ok) {
    throw new Error(`La playlist a répondu avec le statut ${response.status}.`);
  }

  return parsePlaylist(await response.text());
}
