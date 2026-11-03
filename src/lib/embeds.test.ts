import assert from "node:assert/strict";
import test from "node:test";

import { getEmbedUrl } from "./embeds";

test("convertit les vidéos et directs YouTube en lecteur officiel", () => {
  assert.equal(
    getEmbedUrl("https://www.youtube.com/watch?v=TCnaIE_SAtM", "youtube", "tv.test"),
    "https://www.youtube.com/embed/TCnaIE_SAtM?autoplay=1",
  );
  assert.equal(
    getEmbedUrl("https://youtu.be/TCnaIE_SAtM", "youtube", "tv.test"),
    "https://www.youtube.com/embed/TCnaIE_SAtM?autoplay=1",
  );
  assert.equal(
    getEmbedUrl("https://www.youtube.com/channel/UCQfwfsi5VrQ8yKZ-UWmAEFg/live", "youtube", "tv.test"),
    "https://www.youtube.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAEFg&autoplay=1",
  );
});

test("renonce aux pages YouTube sans identifiant exploitable", () => {
  assert.equal(getEmbedUrl("https://www.youtube.com/@france24/live", "youtube", "tv.test"), null);
  assert.equal(getEmbedUrl("https://www.youtube.com/c/c5n/live", "youtube", "tv.test"), null);
  assert.equal(getEmbedUrl("https://www.youtube.com/watch?v=<script>", "youtube", "tv.test"), null);
});

test("convertit Dailymotion et Twitch", () => {
  assert.equal(
    getEmbedUrl("https://www.dailymotion.com/video/x8abcd", "dailymotion", "tv.test"),
    "https://geo.dailymotion.com/player.html?video=x8abcd",
  );
  assert.equal(
    getEmbedUrl("https://www.twitch.tv/Example_TV", "twitch", "tv.test"),
    "https://player.twitch.tv/?channel=example_tv&parent=tv.test",
  );
  assert.equal(
    getEmbedUrl("https://www.twitch.tv/videos/123456", "twitch", "tv.test"),
    "https://player.twitch.tv/?video=123456&parent=tv.test",
  );
});

test("ignore les domaines qui ne correspondent pas au type annoncé", () => {
  assert.equal(getEmbedUrl("https://notyoutube.com/watch?v=TCnaIE_SAtM", "youtube", "tv.test"), null);
  assert.equal(getEmbedUrl("https://example.test/video/x8abcd", "dailymotion", "tv.test"), null);
});
