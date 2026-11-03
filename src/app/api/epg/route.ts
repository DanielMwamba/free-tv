import { NextResponse, type NextRequest } from "next/server";

import { getCatalogue } from "@/lib/channels";
import { guideCountry, type GuideEntry } from "@/lib/epg";
import { createGuideStore } from "@/lib/epg-source";
import { requestUpstream } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = createGuideStore({ requestUpstream });
const EMPTY: GuideEntry = { now: null, next: null };

function reply(entry: GuideEntry, status = 200) {
  return NextResponse.json(entry, { status, headers: { "Cache-Control": "private, max-age=60" } });
}

// Programme en cours et suivant d'une chaîne du catalogue. Le guide consulté est toujours celui
// que la playlist annonce pour le pays de la chaîne : le client ne choisit jamais l'URL.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("c");
  if (!id || !/^[\w-]{1,200}$/.test(id)) return reply(EMPTY, 400);

  try {
    const { channels, guideUrls } = await getCatalogue();
    const channel = channels.find((candidate) => candidate.id === id);
    const country = channel?.tvgId ? guideCountry(channel.tvgId) : null;
    const url = country ? guideUrls.get(country) : undefined;
    if (!channel?.tvgId || !url) return reply(EMPTY);
    return reply(await store.lookup(url, channel.tvgId, channel.cleanName));
  } catch {
    return reply(EMPTY, 502);
  }
}
