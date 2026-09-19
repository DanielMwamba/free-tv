"use client";

import { useLayoutEffect } from "react";

const CONTRACT = `THESIS: FREE TV is an instant broadcast index shaped by functional teletext. OWN-WORLD: numbered pages, character grid, mosaic signal colors, and one tuning sweep. STORY: find a country, choose a numbered channel, watch or recover clearly. FIRST VIEWPORT: searchable channel index left, dominant player right; player first on mobile. FORM: chosen form position 3, concept seed fbf27a9c. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`;

export function DirectionContract() {
  useLayoutEffect(() => {
    const body = document.body;
    const existing = Array.from(body.childNodes).find(
      (node) => node.nodeType === Node.COMMENT_NODE && node.textContent?.includes("THESIS:"),
    );

    if (!existing) body.insertBefore(document.createComment(` ${CONTRACT} `), body.firstChild);
  }, []);

  return null;
}
