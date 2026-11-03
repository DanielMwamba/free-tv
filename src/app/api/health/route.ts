import { NextResponse } from "next/server";

import { getChannels } from "@/lib/channels";
import { createHealthChecker } from "@/lib/health";
import { requestUpstream } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seuls les flux HLS se contrôlent : les lecteurs officiels intégrés ne signalent pas leur état.
const checker = createHealthChecker({
  loadTargets: async () =>
    (await getChannels())
      .filter((channel) => channel.kind === "hls")
      .map((channel) => ({ id: channel.id, url: channel.url })),
  requestUpstream,
});

export function GET() {
  return NextResponse.json(checker.snapshot(), { headers: { "Cache-Control": "no-store" } });
}
