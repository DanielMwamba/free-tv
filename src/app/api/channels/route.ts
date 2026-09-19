import { NextResponse } from "next/server";

import { getChannels } from "@/lib/channels";

export async function GET() {
  try {
    const channels = await getChannels();

    return NextResponse.json(
      { channels, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    return NextResponse.json(
      { channels: [], error: `Impossible de charger la playlist Free-TV/IPTV. ${message}` },
      { status: 502 },
    );
  }
}
