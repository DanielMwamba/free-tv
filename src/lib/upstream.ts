import { lookup } from "node:dns/promises";

import { isPrivateAddress } from "./hls-proxy";
import type { UpstreamRequest } from "./stream-relay";

const UPSTREAM_TIMEOUT_MS = 30_000;

async function assertPublicHostname(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Destination privée interdite.");
  }
}

export const requestUpstream: UpstreamRequest = async (url, headers, signal) => {
  await assertPublicHostname(url.hostname.replace(/^\[|\]$/g, ""));

  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  return fetch(url, {
    cache: "no-store",
    redirect: "manual",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers,
  });
};
