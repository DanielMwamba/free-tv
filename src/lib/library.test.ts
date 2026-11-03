import assert from "node:assert/strict";
import test from "node:test";

import { pushRecent, readIds, toggleId, writeIds } from "./library";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

test("ajoute puis retire un favori", () => {
  assert.deepEqual(toggleId(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleId(["a", "b"], "a"), ["b"]);
});

test("place la chaîne récente en tête, sans doublon et avec une limite", () => {
  assert.deepEqual(pushRecent(["a", "b", "c"], "b"), ["b", "a", "c"]);
  assert.deepEqual(pushRecent(["a", "b", "c"], "d", 3), ["d", "a", "b"]);
});

test("relit et écrit les listes stockées", () => {
  const storage = memoryStorage();
  writeIds(storage, "k", ["a", "b"]);
  assert.deepEqual(readIds(storage, "k"), ["a", "b"]);
});

test("ignore un stockage absent, corrompu ou d'un autre type", () => {
  assert.deepEqual(readIds(undefined, "k"), []);
  assert.deepEqual(readIds(memoryStorage({ k: "{oups" }), "k"), []);
  assert.deepEqual(readIds(memoryStorage({ k: '{"a":1}' }), "k"), []);
  assert.deepEqual(readIds(memoryStorage({ k: '["a",2,null]' }), "k"), ["a"]);
});

test("survit à un stockage qui refuse l'écriture", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.doesNotThrow(() => writeIds(storage, "k", ["a"]));
});
