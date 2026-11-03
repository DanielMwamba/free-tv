import assert from "node:assert/strict";
import test from "node:test";

import { createStreamRelay, type UpstreamRequest } from "./stream-relay";

const CATALOGUE = ["https://tv.example.test/live/index.m3u8"];

function upstreamFrom(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  const requestUpstream: UpstreamRequest = async (url) => {
    calls.push(url.toString());
    const route = routes[url.toString()];
    return route ? route() : new Response("absent", { status: 404 });
  };
  return { calls, requestUpstream };
}

const manifest = (body: string) => () =>
  new Response(body, { headers: { "Content-Type": "application/vnd.apple.mpegurl" } });

test("refuse les requêtes sans URL ou avec une URL invalide", async () => {
  const { relay } = createStreamRelay({
    loadCatalogueUrls: async () => CATALOGUE,
    requestUpstream: upstreamFrom({}).requestUpstream,
  });

  assert.equal((await relay(null, null)).status, 400);
  assert.equal((await relay("pas une url", null)).status, 400);
});

test("refuse les hôtes absents du catalogue", async () => {
  const { calls, requestUpstream } = upstreamFrom({});
  const { relay } = createStreamRelay({ loadCatalogueUrls: async () => CATALOGUE, requestUpstream });

  const response = await relay("https://evil.example.test/index.m3u8", null);

  assert.equal(response.status, 403);
  assert.deepEqual(calls, []);
});

test("recharge le catalogue après un échec au lieu de mémoriser l'erreur", async () => {
  let attempts = 0;
  const { requestUpstream } = upstreamFrom({ [CATALOGUE[0]]: manifest("#EXTM3U") });
  const { relay } = createStreamRelay({
    loadCatalogueUrls: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("réseau coupé");
      return CATALOGUE;
    },
    requestUpstream,
  });

  assert.equal((await relay(CATALOGUE[0], null)).status, 503);
  assert.equal((await relay(CATALOGUE[0], null)).status, 200);
  assert.equal(attempts, 2);
});

test("réécrit le manifeste et autorise les hôtes qu'il annonce", async () => {
  const segment = "https://cdn.example.test/segment-1.ts";
  const { requestUpstream } = upstreamFrom({
    [CATALOGUE[0]]: manifest(`#EXTM3U\n#EXTINF:6,\n${segment}`),
    [segment]: () =>
      new Response("video", { headers: { "Content-Type": "video/mp2t", "Content-Length": "5" } }),
  });
  const { relay } = createStreamRelay({ loadCatalogueUrls: async () => CATALOGUE, requestUpstream });

  const manifestResponse = await relay(CATALOGUE[0], null);
  assert.equal(manifestResponse.headers.get("cache-control"), "no-store");
  assert.match(await manifestResponse.text(), /\/api\/stream\?url=https%3A%2F%2Fcdn\.example\.test/);

  const segmentResponse = await relay(segment, null);
  assert.equal(segmentResponse.status, 200);
  assert.equal(segmentResponse.headers.get("content-length"), "5");
  assert.equal(segmentResponse.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await segmentResponse.text(), "video");
});

test("suit les redirections publiques et bloque celles vers une adresse privée", async () => {
  const moved = "https://mirror.example.test/live/index.m3u8";
  const { requestUpstream } = upstreamFrom({
    [CATALOGUE[0]]: () => new Response(null, { status: 302, headers: { Location: moved } }),
    [moved]: manifest("#EXTM3U"),
  });
  const { relay } = createStreamRelay({ loadCatalogueUrls: async () => CATALOGUE, requestUpstream });
  assert.equal((await relay(CATALOGUE[0], null)).status, 200);

  const { requestUpstream: toPrivate } = upstreamFrom({
    [CATALOGUE[0]]: () =>
      new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/admin" } }),
  });
  const blocked = createStreamRelay({ loadCatalogueUrls: async () => CATALOGUE, requestUpstream: toPrivate });
  assert.equal((await blocked.relay(CATALOGUE[0], null)).status, 403);
});

test("relaie le statut d'erreur du diffuseur", async () => {
  const { requestUpstream } = upstreamFrom({
    [CATALOGUE[0]]: () => new Response("geo", { status: 451 }),
  });
  const { relay } = createStreamRelay({ loadCatalogueUrls: async () => CATALOGUE, requestUpstream });

  assert.equal((await relay(CATALOGUE[0], null)).status, 451);
});
