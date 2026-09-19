import assert from "node:assert/strict";
import test from "node:test";

import { isPrivateAddress, rewriteHlsManifest } from "./hls-proxy";

test("réécrit les playlists, segments et clés HLS vers le relais", () => {
  const source = `#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="keys/live.key"
#EXT-X-STREAM-INF:BANDWIDTH=1800000
quality/720.m3u8
#EXTINF:6,
https://cdn.example.test/segment-1.ts`;
  const discovered: string[] = [];
  const rewritten = rewriteHlsManifest(source, "https://tv.example.test/live/index.m3u8", (url) => {
    discovered.push(url.toString());
  });

  assert.match(rewritten, /url=https%3A%2F%2Ftv\.example\.test%2Flive%2Fkeys%2Flive\.key/);
  assert.match(rewritten, /url=https%3A%2F%2Ftv\.example\.test%2Flive%2Fquality%2F720\.m3u8/);
  assert.match(rewritten, /url=https%3A%2F%2Fcdn\.example\.test%2Fsegment-1\.ts/);
  assert.equal(discovered.length, 3);
});

test("bloque les familles d'adresses privées et locales", () => {
  assert.equal(isPrivateAddress("127.0.0.1"), true);
  assert.equal(isPrivateAddress("10.2.3.4"), true);
  assert.equal(isPrivateAddress("192.168.1.20"), true);
  assert.equal(isPrivateAddress("::1"), true);
  assert.equal(isPrivateAddress("fd12::10"), true);
  assert.equal(isPrivateAddress("1.1.1.1"), false);
  assert.equal(isPrivateAddress("2606:4700:4700::1111"), false);
});
