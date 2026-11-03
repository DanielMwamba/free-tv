"use client";

import { ExternalLink, Radio, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { Channel } from "@/lib/channels";

type PlayerState = "idle" | "loading" | "ready" | "error" | "unsupported";

export function VideoPlayer({ channel }: { channel: Channel | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    let disposed = false;
    const updateState = (nextState: PlayerState) => {
      queueMicrotask(() => {
        if (!disposed) setState(nextState);
      });
    };

    if (!video || !channel) {
      updateState("idle");
      return () => {
        disposed = true;
      };
    }

    video.removeAttribute("src");
    video.load();

    if (channel.kind !== "hls") {
      updateState("unsupported");
      return () => {
        disposed = true;
      };
    }

    let destroyHls: (() => void) | undefined;
    const onReady = () => !disposed && setState("ready");
    const onError = () => !disposed && setState("error");

    updateState("loading");
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);

    const streamUrl = `/api/stream?url=${encodeURIComponent(channel.url)}`;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.load();
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          setState("unsupported");
          return;
        }

        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        destroyHls = () => hls.destroy();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, onReady);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) onError();
        });
      });
    }

    return () => {
      disposed = true;
      destroyHls?.();
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      video.load();
    };
  }, [channel, attempt]);

  const statusText = {
    idle: "Sélectionnez une chaîne dans l’index.",
    loading: "Syntonisation du flux…",
    ready: "Signal reçu. Lancez la lecture.",
    error: "Le diffuseur ne répond pas ou bloque la lecture web.",
    unsupported: "Cette source ne peut pas être intégrée directement ici.",
  }[state];

  return (
    <section className="player-panel" aria-labelledby="player-title">
      <div className="player-heading">
        <div>
          <h1 id="player-title">{channel?.cleanName ?? "AUCUNE CHAÎNE"}</h1>
          <p>{channel ? `${channel.country} · ${channel.kind.toUpperCase()}` : "INDEX MONDIAL"}</p>
        </div>
        <span className={`signal signal-${state}`} aria-hidden="true">
          <Radio size={16} strokeWidth={2.5} />
          {state === "ready" ? "EN LIGNE" : "SIGNAL"}
        </span>
      </div>

      <div className={`screen screen-${state}`}>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          aria-label={channel ? `Lecteur de ${channel.cleanName}` : "Lecteur TV"}
        />

        {state !== "ready" && (
          <div className="screen-message" role="status" aria-live="polite">
            {state === "error" || state === "unsupported" ? (
              <TriangleAlert size={32} strokeWidth={1.8} />
            ) : (
              <Radio size={34} strokeWidth={1.7} />
            )}
            <strong>{statusText}</strong>
            {state === "error" && (
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                <RefreshCw /> Réessayer
              </Button>
            )}
            {channel && (state === "error" || state === "unsupported") && (
              <a
                className={buttonVariants()}
                href={channel.url}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir la source <ExternalLink />
              </a>
            )}
          </div>
        )}

        {state === "loading" && <span className="tuning-sweep" aria-hidden="true" />}
      </div>

      <div className="player-meta" aria-live="polite">
        <span>STATUT</span>
        <strong>{statusText}</strong>
        {channel?.isGeoBlocked && <em>GÉO-RESTREINT</em>}
        {channel?.isSd && <em>QUALITÉ SD</em>}
        {channel && !channel.isSecure && (
          <em title="Le relais contacte ce diffuseur sans chiffrement.">SOURCE HTTP</em>
        )}
      </div>
    </section>
  );
}
