import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";

import { isPrivateAddress } from "./hls-proxy";
import type { UpstreamRequest } from "./stream-relay";

const UPSTREAM_TIMEOUT_MS = 30_000;
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

export function filterPublicAddresses(addresses: LookupAddress[]) {
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Destination privée interdite.");
  }
  return addresses;
}

/**
 * Résolution utilisée par la connexion elle-même : l'adresse vérifiée est celle qui sera
 * contactée, ce qui empêche un changement DNS entre la vérification et la requête.
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    try {
      const allowed = filterPublicAddresses(addresses);
      if (options.all) return callback(null, allowed);
      return callback(null, allowed[0].address, allowed[0].family);
    } catch (reason) {
      return callback(reason as NodeJS.ErrnoException, "", 0);
    }
  });
};

export const requestUpstream: UpstreamRequest = (url, headers, signal) =>
  new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: publicLookup,
        signal,
        // Sans décompression automatique, on demande un corps brut.
        headers: { ...headers, "Accept-Encoding": "identity" },
      },
      (response) => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (value === undefined) continue;
          responseHeaders.set(name, Array.isArray(value) ? value.join(", ") : value);
        }

        const status = response.statusCode ?? 502;
        const body = NULL_BODY_STATUSES.has(status)
          ? null
          : (Readable.toWeb(response) as ReadableStream<Uint8Array>);
        if (!body) response.resume();
        resolve(new Response(body, { status, headers: responseHeaders }));
      },
    );

    request.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      request.destroy(new Error("Le diffuseur ne répond pas."));
    });
    request.on("error", reject);
    request.end();
  });
