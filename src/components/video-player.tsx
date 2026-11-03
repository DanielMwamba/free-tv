"use client";

import { ExternalLink, RefreshCw, TriangleAlert, Tv } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChannelLogo } from "@/components/channel-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Channel } from "@/lib/channels";
import { getEmbedUrl } from "@/lib/embeds";
import { classifyPlaybackFailure } from "@/lib/playback-error";

type PlayerState = "idle" | "loading" | "ready" | "embed" | "error" | "geoblocked" | "unsupported";

export function VideoPlayer({ channel, number }: { channel: Channel | null; number?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [attempt, setAttempt] = useState(0);
  const embedUrl = useMemo(
    () =>
      channel && typeof window !== "undefined"
        ? getEmbedUrl(channel.url, channel.kind, window.location.hostname)
        : null,
    [channel],
  );

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
      updateState(embedUrl ? "embed" : "unsupported");
      return () => {
        disposed = true;
      };
    }

    let destroyHls: (() => void) | undefined;
    const onReady = () => !disposed && setState("ready");
    const onError = (status?: number) =>
      !disposed && setState(classifyPlaybackFailure(status, channel.isGeoBlocked));
    const onMediaError = () => onError();

    updateState("loading");
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onMediaError);

    const streamUrl = `/api/stream?url=${encodeURIComponent(channel.url)}`;

    // hls.js d'abord : il expose le statut HTTP des échecs. Le HLS natif sert de repli
    // sur les navigateurs sans Media Source Extensions.
    void import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = streamUrl;
          video.load();
        } else {
          setState("unsupported");
        }
        return;
      }

      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      destroyHls = () => hls.destroy();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onError(data.response?.code);
      });
    });

    return () => {
      disposed = true;
      destroyHls?.();
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onMediaError);
      video.removeAttribute("src");
      video.load();
    };
  }, [channel, attempt, embedUrl]);

  const statusText = {
    idle: "Choisissez une chaîne dans le guide.",
    loading: "Connexion au flux…",
    ready: "En direct.",
    embed: "Lecteur officiel de la plateforme.",
    error: "Le diffuseur ne répond pas ou bloque la lecture web.",
    geoblocked: "Le diffuseur refuse l’accès : chaîne probablement réservée à son pays de diffusion.",
    unsupported: "Cette source ne peut pas être intégrée directement ici.",
  }[state];
  const isFailure = state === "error" || state === "geoblocked" || state === "unsupported";

  return (
    <div className="player">
      <div className={`screen screen-${state}`}>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          aria-label={channel ? `Lecteur de ${channel.cleanName}` : "Lecteur TV"}
          hidden={state === "embed"}
        />

        {state === "embed" && embedUrl && channel && (
          <iframe
            key={`${embedUrl}-${attempt}`}
            src={embedUrl}
            title={`Lecteur officiel de ${channel.cleanName}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {state !== "ready" && state !== "embed" && (
          <div className="screen-message" role="status" aria-live="polite">
            {state === "loading" && <span className="spinner" aria-hidden="true" />}
            {isFailure && <TriangleAlert className="alert-icon" size={32} strokeWidth={1.8} aria-hidden="true" />}
            {state === "idle" && <Tv size={34} strokeWidth={1.6} aria-hidden="true" />}
            <strong>{statusText}</strong>
            {isFailure && channel && (
              <div className="actions">
                {state === "error" && (
                  <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
                    <RefreshCw /> Réessayer
                  </Button>
                )}
                <a className={buttonVariants()} href={channel.url} target="_blank" rel="noreferrer">
                  Ouvrir la source <ExternalLink />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {channel && (
        <div className="now-playing">
          <ChannelLogo channel={channel} large />
          <div>
            <h1>{channel.cleanName}</h1>
            <div className="now-meta">
              {(state === "ready" || state === "embed") && <span className="badge badge-live">En direct</span>}
              {number !== undefined && <span>Chaîne {number}</span>}
              <span className="sep" aria-hidden="true">·</span>
              <span>{channel.country}</span>
              {channel.isGeoBlocked && <span className="badge badge-warn">Restreinte à sa région</span>}
              {channel.isSd && <span className="badge">SD</span>}
              {!channel.isSecure && (
                <span className="badge" title="Le relais contacte ce diffuseur sans chiffrement.">
                  Source HTTP
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {channel && state === "embed" && (
        <p className="status-line">
          Le lecteur officiel ne signale pas ses erreurs : si rien ne s’affiche,{" "}
          <a href={channel.url} target="_blank" rel="noreferrer">
            ouvrir sur la plateforme <ExternalLink size={13} aria-hidden="true" />
          </a>
        </p>
      )}
    </div>
  );
}
