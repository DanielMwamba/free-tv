import { NextRequest } from "next/server";

import { getChannels } from "@/lib/channels";
import { createStreamRelay } from "@/lib/stream-relay";
import { requestUpstream } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { relay } = createStreamRelay({
  loadCatalogueUrls: async () => (await getChannels()).map((channel) => channel.url),
  requestUpstream,
});

export function GET(request: NextRequest) {
  return relay(
    request.nextUrl.searchParams.get("url"),
    request.headers.get("range"),
    request.signal,
  );
}
