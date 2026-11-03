import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { createGuideStore } from "./epg-source";
import type { UpstreamRequest } from "./stream-relay";

const GUIDE_URL = "https://epgshare01.online/epgshare01/epg_ripper_FR1.xml.gz";
const XMLTV = `<tv>
  <channel id="France.2..fr"><display-name>France 2</display-name></channel>
  <programme channel="France.2..fr" start="20261103050000 +0000" stop="20261103070000 +0000"><title>Matin</title></programme>
  <programme channel="France.2..fr" start="20261103070000 +0000" stop="20261103090000 +0000"><title>Midi</title></programme>
</tv>`;

test("télécharge, décompresse et met en cache le guide d'un pays", async () => {
  const calls: string[] = [];
  const requestUpstream: UpstreamRequest = async (url) => {
    calls.push(url.toString());
    if (url.pathname.endsWith("old.xml.gz")) {
      return new Response(null, { status: 302, headers: { location: GUIDE_URL } });
    }
    return new Response(gzipSync(XMLTV));
  };
  let time = Date.UTC(2026, 10, 3, 6, 0, 0);
  const store = createGuideStore({ requestUpstream, now: () => time, ttlMs: 1000 });

  const entry = await store.lookup("https://epgshare01.online/epgshare01/old.xml.gz", "France2.fr", "France 2");
  assert.equal(entry.now?.title, "Matin");
  assert.equal(entry.next?.title, "Midi");

  await store.lookup("https://epgshare01.online/epgshare01/old.xml.gz", "France2.fr", "France 2");
  assert.equal(calls.length, 2, "une redirection puis le cache");

  time += 2 * 60 * 60 * 1000;
  assert.equal((await store.lookup(GUIDE_URL, "France2.fr", "France 2")).now?.title, "Midi");
});

test("refuse les guides privés ou non chiffrés et mémorise l'échec", async () => {
  let calls = 0;
  const requestUpstream: UpstreamRequest = async () => {
    calls += 1;
    return new Response("pas un gzip");
  };
  const store = createGuideStore({ requestUpstream });

  assert.deepEqual(await store.lookup("https://127.0.0.1/guide.xml.gz", "A.fr", "A"), { now: null, next: null });
  assert.deepEqual(await store.lookup("http://epgshare01.online/guide.xml.gz", "A.fr", "A"), { now: null, next: null });
  assert.equal(calls, 0, "aucune requête vers une destination refusée");

  await store.lookup(GUIDE_URL, "A.fr", "A");
  await store.lookup(GUIDE_URL, "A.fr", "A");
  assert.equal(calls, 1, "un guide illisible n'est pas retéléchargé aussitôt");
});
