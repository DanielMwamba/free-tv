import assert from "node:assert/strict";
import test from "node:test";

import { createHealthChecker } from "./health";
import { classifyProbe, summarizeHealth } from "./health-report";
import type { UpstreamRequest } from "./stream-relay";

test("classe la réponse d'un diffuseur", () => {
  assert.equal(classifyProbe(200, "#EXTM3U\n#EXT-X-VERSION:3"), "online");
  assert.equal(classifyProbe(200, "<html>Not found</html>"), "offline");
  assert.equal(classifyProbe(403, ""), "blocked");
  assert.equal(classifyProbe(451, ""), "blocked");
  assert.equal(classifyProbe(500, "#EXTM3U"), "offline");
});

test("publie les résultats au fil du contrôle", async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const checker = createHealthChecker({
    loadTargets: async () => [
      { id: "fast", url: "https://fast.example.test/a.m3u8" },
      { id: "slow", url: "https://slow.example.test/a.m3u8" },
    ],
    requestUpstream: async (url) => {
      if (url.hostname.startsWith("slow")) await gate;
      return new Response("#EXTM3U");
    },
  });

  checker.snapshot();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const during = checker.snapshot();
  assert.equal(during.running, true);
  assert.deepEqual(during.results, { fast: "online" });

  release();
  assert.deepEqual((await checker.settle()).results, { fast: "online", slow: "online" });
});

test("contrôle chaque flux, suit les redirections et met le résultat en cache", async () => {
  const calls: string[] = [];
  const requestUpstream: UpstreamRequest = async (url) => {
    calls.push(url.toString());
    switch (url.toString()) {
      case "https://a.example.test/live.m3u8":
        return new Response("#EXTM3U");
      case "https://b.example.test/live.m3u8":
        return new Response(null, { status: 302, headers: { location: "https://c.example.test/x.m3u8" } });
      case "https://c.example.test/x.m3u8":
        return new Response("#EXTM3U");
      case "https://d.example.test/live.m3u8":
        return new Response("interdit", { status: 403 });
      default:
        throw new Error("réseau");
    }
  };

  let time = 0;
  const checker = createHealthChecker({
    loadTargets: async () => [
      { id: "a", url: "https://a.example.test/live.m3u8" },
      { id: "b", url: "https://b.example.test/live.m3u8" },
      { id: "d", url: "https://d.example.test/live.m3u8" },
      { id: "e", url: "https://e.example.test/live.m3u8" },
      { id: "local", url: "http://127.0.0.1/live.m3u8" },
    ],
    requestUpstream,
    now: () => time,
    ttlMs: 1000,
  });

  const report = await checker.settle();
  assert.deepEqual(report.results, { a: "online", b: "online", d: "blocked", e: "offline", local: "offline" });
  assert.equal(report.checked, 5);
  assert.equal(report.running, false);
  assert.ok(!calls.some((url) => url.includes("127.0.0.1")), "les adresses privées ne sont jamais contactées");
  assert.deepEqual(summarizeHealth(report.results), { online: 2, blocked: 1, offline: 2 });

  const callCount = calls.length;
  await checker.settle();
  assert.equal(calls.length, callCount, "le résultat reste en cache avant expiration");

  time = 2000;
  await checker.settle();
  assert.ok(calls.length > callCount, "un nouveau contrôle démarre après expiration");
});
