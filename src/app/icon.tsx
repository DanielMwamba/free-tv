import { ImageResponse } from "next/og";

const SIZES = [192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

/** Icône de l'application : l'écran de télévision du logo sur la couleur d'accent, en pleine page pour les icônes masquables. */
export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  const glyph = Math.round(size * 0.5);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#4f8cff" }}>
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
          <polyline points="17 2 12 7 7 2" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
