import assert from "node:assert/strict";
import test from "node:test";

import {
  appendDigit,
  channelAtNumber,
  readSharedChannelId,
  stepChannel,
  withSharedChannel,
} from "./zapping";

const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("passe à la chaîne suivante ou précédente en bouclant", () => {
  assert.equal(stepChannel(list, "a", 1)?.id, "b");
  assert.equal(stepChannel(list, "c", 1)?.id, "a");
  assert.equal(stepChannel(list, "a", -1)?.id, "c");
});

test("démarre au bord de la liste si la chaîne courante n'y figure pas", () => {
  assert.equal(stepChannel(list, "z", 1)?.id, "a");
  assert.equal(stepChannel(list, undefined, -1)?.id, "c");
  assert.equal(stepChannel([], "a", 1), null);
});

test("trouve une chaîne par son numéro", () => {
  assert.equal(channelAtNumber(list, "2")?.id, "b");
  assert.equal(channelAtNumber(list, "0"), null);
  assert.equal(channelAtNumber(list, "4"), null);
  assert.equal(channelAtNumber(list, "1a"), null);
});

test("compose un numéro sur quatre chiffres au plus", () => {
  assert.equal(appendDigit("", "0"), "");
  assert.equal(appendDigit("1", "2"), "12");
  assert.equal(appendDigit("1234", "5"), "2345");
  assert.equal(appendDigit("12", "x"), "12");
});

test("lit et écrit l'identifiant partagé dans l'URL", () => {
  assert.equal(readSharedChannelId("?c=france24-fr"), "france24-fr");
  assert.equal(readSharedChannelId("?c=<script>"), null);
  assert.equal(readSharedChannelId(""), null);
  assert.equal(withSharedChannel("https://tv.test/?x=1", "arte"), "https://tv.test/?x=1&c=arte");
  assert.equal(withSharedChannel("https://tv.test/?c=arte", null), "https://tv.test/");
});
