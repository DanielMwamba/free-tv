import assert from "node:assert/strict";
import test from "node:test";

import { audioOptions, AUTO_LEVEL, qualityOptions } from "./tracks";

test("propose les qualités de la plus haute à la plus basse", () => {
  const options = qualityOptions([
    { height: 360, bitrate: 800_000 },
    { height: 1080, bitrate: 5_000_000 },
    { height: 720, bitrate: 2_500_000 },
    { height: 720, bitrate: 3_000_000 },
  ]);
  assert.deepEqual(options, [
    { value: AUTO_LEVEL, label: "Auto" },
    { value: 1, label: "1080p" },
    { value: 3, label: "720p" },
    { value: 0, label: "360p" },
  ]);
});

test("se rabat sur le débit sans définition et masque un choix unique", () => {
  assert.deepEqual(qualityOptions([{ height: 720, bitrate: 2_000_000 }]), []);
  assert.deepEqual(qualityOptions([{ bitrate: 128_000 }, { bitrate: 64_000 }]).map((option) => option.label), [
    "Auto",
    "128 kb/s",
    "64 kb/s",
  ]);
});

test("nomme les pistes audio", () => {
  assert.deepEqual(audioOptions([{ name: "VF" }]), []);
  assert.deepEqual(
    audioOptions([{ name: " Audiodescription " }, { lang: "en" }, {}]).map((option) => option.label),
    ["Audiodescription", "Anglais", "Piste 3"],
  );
});
