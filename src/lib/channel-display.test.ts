import assert from "node:assert/strict";
import test from "node:test";

import { channelInitials, safeLogoUrl } from "./channel-display";

test("n'affiche que les logos HTTPS", () => {
  assert.equal(safeLogoUrl("https://i.imgur.com/logo.png"), "https://i.imgur.com/logo.png");
  assert.equal(safeLogoUrl("http://example.com/logo.png"), null);
  assert.equal(safeLogoUrl("javascript:alert(1)"), null);
  assert.equal(safeLogoUrl("pas une url"), null);
  assert.equal(safeLogoUrl(null), null);
});

test("calcule des initiales lisibles", () => {
  assert.equal(channelInitials("France 24"), "F2");
  assert.equal(channelInitials("Arte"), "AR");
  assert.equal(channelInitials("DW (English)"), "DE");
  assert.equal(channelInitials("—"), "TV");
});
