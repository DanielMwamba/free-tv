import assert from "node:assert/strict";
import test from "node:test";

import { parsePlaylist } from "./channels";

const PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-name="France Info" tvg-logo="https://example.test/logo.png" tvg-id="FranceInfo.fr" tvg-country="FR" group-title="France",France Info Ⓢ Ⓖ
https://example.test/live/index.m3u8
#EXTINF:-1 tvg-name="Direct Monde" tvg-country="" group-title="International",Direct Monde Ⓨ
https://www.youtube.com/channel/example/live
#EXTINF:-1 tvg-name="Invalide",Invalide
not-a-url`;

test("parse les métadonnées M3U utiles à l'interface", () => {
  const [channel] = parsePlaylist(PLAYLIST);

  assert.equal(channel.cleanName, "France Info");
  assert.equal(channel.country, "France");
  assert.equal(channel.kind, "hls");
  assert.equal(channel.isGeoBlocked, true);
  assert.equal(channel.isSd, true);
  assert.equal(channel.isSecure, true);
});

test("classe les plateformes et ignore les URL invalides", () => {
  const channels = parsePlaylist(PLAYLIST);

  assert.equal(channels.length, 2);
  assert.equal(channels[1]?.kind, "youtube");
  assert.equal(channels[1]?.country, "International");
});

test("reconnaît les plateformes par domaine exact", () => {
  const kinds = parsePlaylist(`#EXTM3U
#EXTINF:-1,Dailymotion
https://www.dailymotion.com/video/x8abcd
#EXTINF:-1,Twitch
https://www.twitch.tv/example
#EXTINF:-1,Imitation
https://notyoutube.com/watch?v=abc`).map((channel) => channel.kind);

  assert.deepEqual(kinds, ["dailymotion", "twitch", "external"]);
});
