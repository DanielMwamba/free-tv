"use client";

import { useEffect, useState } from "react";

import type { Channel } from "@/lib/channels";
import { programmeProgress, type GuideEntry } from "@/lib/epg";

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const MIN_REFRESH = 5_000;
const MAX_REFRESH = 30 * 60 * 1000;

function useGuide(channel: Channel | null) {
  const [entry, setEntry] = useState<{ id: string; guide: GuideEntry } | null>(null);

  useEffect(() => {
    if (!channel?.tvgId) return;
    const controller = new AbortController();
    let timer: number | undefined;

    const load = async () => {
      try {
        const response = await fetch(`/api/epg?c=${encodeURIComponent(channel.id)}`, { signal: controller.signal });
        if (!response.ok) return;
        const guide = (await response.json()) as GuideEntry;
        setEntry({ id: channel.id, guide });
        // Nouvelle demande à la fin du programme en cours, pour passer au suivant.
        const delay = guide.now ? guide.now.stop - Date.now() : MAX_REFRESH;
        timer = window.setTimeout(load, Math.min(Math.max(delay, MIN_REFRESH), MAX_REFRESH));
      } catch {
        // Guide indisponible : le bandeau reste sans programme.
      }
    };
    void load();

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [channel]);

  return entry && entry.id === channel?.id ? entry.guide : null;
}

function useClock(interval: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

/** « En ce moment » et « Ensuite », d'après le guide XMLTV annoncé par la playlist. */
export function ProgrammeGuide({ channel }: { channel: Channel | null }) {
  const guide = useGuide(channel);
  const now = useClock(30_000);
  if (!guide || (!guide.now && !guide.next)) return null;

  return (
    <div className="programme-guide">
      {guide.now && (
        <div className="programme programme-now">
          <span className="programme-label">En ce moment</span>
          <strong className="programme-title">{guide.now.title}</strong>
          <span className="programme-time">
            {TIME.format(guide.now.start)} – {TIME.format(guide.now.stop)}
          </span>
          <span className="programme-progress" aria-hidden="true">
            <span style={{ width: `${Math.round(programmeProgress(guide.now, now) * 100)}%` }} />
          </span>
        </div>
      )}
      {guide.next && (
        <div className="programme">
          <span className="programme-label">Ensuite</span>
          <span className="programme-title">{guide.next.title}</span>
          <span className="programme-time">{TIME.format(guide.next.start)}</span>
        </div>
      )}
    </div>
  );
}
