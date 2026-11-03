import assert from "node:assert/strict";
import test from "node:test";

import { categorize } from "./categories";

test("déduit la catégorie du nom de la chaîne", () => {
  assert.equal(categorize("France 24"), "news");
  assert.equal(categorize("Euronews Albania"), "news");
  assert.equal(categorize("Rai Sport"), "sport");
  assert.equal(categorize("Eurosport 1"), "sport");
  assert.equal(categorize("Gulli"), "kids");
  assert.equal(categorize("Nickelodeon Junior"), "kids");
  assert.equal(categorize("AlbKanale Music TV"), "music");
  assert.equal(categorize("Rakuten Cinema"), "movies");
  assert.equal(categorize("KTO"), "religion");
  assert.equal(categorize("Arte"), "general");
});

test("ne confond pas un mot qui contient un mot-clé", () => {
  assert.equal(categorize("Information Kanal"), "general");
  assert.equal(categorize("Rockdale TV"), "general");
});
