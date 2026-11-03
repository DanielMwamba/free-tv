"use client";

import { useState } from "react";

import type { Channel } from "@/lib/channels";
import { channelInitials, safeLogoUrl } from "@/lib/channel-display";

export function ChannelLogo({ channel, large = false }: { channel: Channel; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const logo = safeLogoUrl(channel.logo);

  return (
    <span className={large ? "logo logo-lg" : "logo"} aria-hidden="true">
      {logo && failedUrl !== logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos tiers arbitraires, non optimisables
        <img
          src={logo}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(logo)}
        />
      ) : (
        channelInitials(channel.cleanName)
      )}
    </span>
  );
}
