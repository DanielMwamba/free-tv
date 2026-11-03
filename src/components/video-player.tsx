"use client";

import { Check, ExternalLink, RefreshCw, Share2, Star, TriangleAlert, Tv } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChannelLogo } from "@/components/channel-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Channel } from "@/lib/channels";
import { getEmbedUrl } from "@/lib/embeds";
import { classifyPlaybackFailure } from "@/lib/playback-error";
import { audioOptions, AUTO_LEVEL, qualityOptions, type TrackOption } from "@/lib/tracks";
import { withSharedChannel } from "@/lib/zapping";

type PlayerState = "idle" | "loading" | "ready" | "embed" | "error" | "geoblocked" | "unsupported";
type HlsInstance = InstanceType<typeof import("hls.js").default>;

type VideoPlayerProps = {
  channel: Channel | null;
  number?: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export function VideoPlayer({ channel, number, isFavorite, onToggleFavorite }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [attempt, setAttempt] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [qualities, setQualities] = useState<TrackOption[]>([]);
  const [level, setLevel] = useState(AUTO_LEVEL);
  const [audios, setAudios] = useState<TrackOption[]>([]);
  const [audio, setAudio] = useState(0);
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
    queueMicrotask(() => {
      if (disposed) return;
      setQualities([]);
      setLevel(AUTO_LEVEL);
      setAudios([]);
      setAudio(0);
    });

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
      hlsRef.current = hls;
      destroyHls = () => {
        hlsRef.current = null;
        hls.destroy();
      };
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        onReady();
        if (!disposed) setQualities(qualityOptions(data.levels));
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (disposed) return;
        setAudios(audioOptions(data.audioTracks));
        setAudio(Math.max(hls.audioTrack, 0));
      });
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
  const share = async () => {
    if (!channel) return;
    const url = withSharedChannel(window.location.href, channel.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: channel.cleanName, url });
      } catch {
        // Partage annulé par l'utilisateur.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(channel.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  };

  const changeLevel = (value: number) => {
    // -1 rend la main à l'adaptation automatique de hls.js.
    if (hlsRef.current) hlsRef.current.currentLevel = value;
    setLevel(value);
  };
  const changeAudio = (value: number) => {
    if (hlsRef.current) hlsRef.current.audioTrack = value;
    setAudio(value);
  };

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
          <div className="now-text">
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
          <div className="now-actions">
            <Button
              variant={isFavorite ? "secondary" : "outline"}
              aria-pressed={isFavorite}
              onClick={onToggleFavorite}
            >
              <Star fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "Favori" : "Ajouter aux favoris"}
            </Button>
            <Button variant="outline" onClick={share}>
              {copiedId === channel.id ? <Check /> : <Share2 />}
              {copiedId === channel.id ? "Lien copié" : "Partager"}
            </Button>
            {state === "ready" && qualities.length > 0 && (
              <label className="track-select">
                <span>Qualité</span>
                <select className="select" value={level} onChange={(event) => changeLevel(Number(event.target.value))}>
                  {qualities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {state === "ready" && audios.length > 0 && (
              <label className="track-select">
                <span>Audio</span>
                <select className="select" value={audio} onChange={(event) => changeAudio(Number(event.target.value))}>
                  {audios.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
