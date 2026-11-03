import assert from "node:assert/strict";
import test from "node:test";

import {
  createXmltvScanner,
  findProgrammes,
  guideCountry,
  normalizeGuideKey,
  nowAndNext,
  parseGuideUrls,
  parseXmltvTime,
  programmeProgress,
} from "./epg";

const XMLTV = `<?xml version="1.0" encoding="UTF-8" ?>
<tv>
  <channel id="France.2..fr"><display-name lang="fr">France 2</display-name></channel>
  <channel id="C.News.fr"><display-name lang="fr">CNews</display-name></channel>
  <programme channel="France.2..fr" start="20261103050000 +0100" stop="20261103070000 +0100">
    <title lang="fr">Le 6h info</title>
  </programme>
  <programme channel="France.2..fr" start="20261103070000 +0100" stop="20261103090000 +0100">
    <title lang="fr">Télématin &amp; météo</title>
  </programme>
  <programme channel="France.2..fr" start="20261103090000 +0100" stop="20261103100000 +0100">
    <title lang="fr">Hors fenêtre</title>
  </programme>
  <programme channel="C.News.fr" start="20261103060000 +0100" stop="20261103080000 +0100">
    <title lang="fr">L&apos;heure des pros</title>
  </programme>
</tv>`;

test("lit les horodatages XMLTV avec leur fuseau", () => {
  assert.equal(parseXmltvTime("20261103050000 +0100"), Date.UTC(2026, 10, 3, 4, 0, 0));
  assert.equal(parseXmltvTime("20261103050000 -0230"), Date.UTC(2026, 10, 3, 7, 30, 0));
  assert.equal(parseXmltvTime("20261103050000"), Date.UTC(2026, 10, 3, 5, 0, 0));
  assert.equal(parseXmltvTime("demain"), null);
});

test("ne retient que les guides nationaux HTTPS de l'en-tête", () => {
  const guides = parseGuideUrls(
    '#EXTM3U x-tvg-url="https://epgshare01.online/epgshare01/epg_ripper_FR1.xml.gz, https://epgshare01.online/epgshare01/epg_ripper_ALL_SOURCES1.xml.gz, http://epgshare01.online/epgshare01/epg_ripper_IT1.xml.gz, https://evil.example/epgshare01/epg_ripper_DE1.xml.gz"',
  );
  assert.deepEqual([...guides], [["fr", "https://epgshare01.online/epgshare01/epg_ripper_FR1.xml.gz"]]);
  assert.equal(guideCountry("France2.fr"), "fr");
  assert.equal(guideCountry("Channel.com"), null);
  assert.equal(normalizeGuideKey("Télé.Matin..fr"), "telematinfr");
});

test("lit le guide par morceaux et retrouve une chaîne par identifiant ou par nom", () => {
  const from = Date.UTC(2026, 10, 3, 5, 0, 0);
  const scanner = createXmltvScanner({ from, until: from + 3 * 60 * 60 * 1000 });
  for (let index = 0; index < XMLTV.length; index += 37) scanner.push(XMLTV.slice(index, index + 37));
  const guide = scanner.result();

  const france2 = findProgrammes(guide, "France2.fr", "France 2");
  assert.deepEqual(
    france2.map((programme) => programme.title),
    ["Le 6h info", "Télématin & météo"],
    "le programme hors de la fenêtre est ignoré",
  );
  assert.equal(findProgrammes(guide, "CNewsTV.fr", "CNews")[0]?.title, "L'heure des pros");
  assert.deepEqual(findProgrammes(guide, "Inconnue.fr", "Inconnue"), []);

  const entry = nowAndNext(france2, Date.UTC(2026, 10, 3, 5, 30, 0));
  assert.equal(entry.now?.title, "Le 6h info");
  assert.equal(entry.next?.title, "Télématin & météo");
  assert.deepEqual(nowAndNext(france2, Date.UTC(2026, 10, 3, 3, 0, 0)), { now: null, next: france2[0] });

  const duplicated = [france2[0], { ...france2[0] }, france2[1]];
  assert.equal(nowAndNext(duplicated, Date.UTC(2026, 10, 3, 5, 30, 0)).next?.title, "Télématin & météo");
});

test("calcule l'avancement d'un programme", () => {
  const programme = { title: "Journal", start: 1000, stop: 3000 };
  assert.equal(programmeProgress(programme, 2000), 0.5);
  assert.equal(programmeProgress(programme, 0), 0);
  assert.equal(programmeProgress(programme, 9000), 1);
});
