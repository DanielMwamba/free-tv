import { isIP } from "node:net";

export function toProxyUrl(resourceUrl: string) {
  return `/api/stream?url=${encodeURIComponent(resourceUrl)}`;
}

function resolveResource(value: string, baseUrl: string) {
  return new URL(value, baseUrl).toString();
}

export function rewriteHlsManifest(
  manifest: string,
  baseUrl: string,
  onResource?: (url: URL) => void,
) {
  const rewrite = (value: string) => {
    const resolved = new URL(resolveResource(value, baseUrl));
    onResource?.(resolved);
    return toProxyUrl(resolved.toString());
  };

  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (!trimmed.startsWith("#")) return rewrite(trimmed);
      return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${rewrite(uri)}"`);
    })
    .join("\n");
}

export function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const family = isIP(normalized);

  if (family === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (family === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    if (normalized.startsWith("::ffff:")) {
      return isPrivateAddress(normalized.slice("::ffff:".length));
    }
  }

  return family === 0;
}
