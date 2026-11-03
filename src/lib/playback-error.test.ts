import assert from "node:assert/strict";
import test from "node:test";

import { classifyPlaybackFailure } from "./playback-error";

test("attribue un refus 451 ou 403 à une restriction régionale", () => {
  assert.equal(classifyPlaybackFailure(451, false), "geoblocked");
  assert.equal(classifyPlaybackFailure(403, false), "geoblocked");
});

test("attribue une erreur sans statut à la région pour les chaînes Ⓖ", () => {
  assert.equal(classifyPlaybackFailure(undefined, true), "geoblocked");
});

test("garde l'erreur générique hors chaîne Ⓖ ou pour un autre statut", () => {
  assert.equal(classifyPlaybackFailure(undefined, false), "error");
  assert.equal(classifyPlaybackFailure(404, true), "error");
});
