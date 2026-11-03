"use client";

import { ExternalLink, Search, Tv, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChannelLogo } from "@/components/channel-logo";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video-player";
import type { Channel } from "@/lib/channels";

type CatalogResponse = {
  channels: Channel[];
  updatedAt?: string;
  error?: string;
};

const PAGE_SIZE = 80;

const FORMAT_LABELS: Record<Channel["kind"], string> = {
  hls: "HLS",
  youtube: "YouTube",
  dailymotion: "Dailymotion",
  twitch: "Twitch",
  external: "Lien",
};

export function TvShell() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("TOUS");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/channels", { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as CatalogResponse;
        if (!response.ok) throw new Error(data.error || "Le catalogue est indisponible.");
        return data;
      })
      .then((data) => {
        setChannels(data.channels);
        setUpdatedAt(data.updatedAt ?? null);
        const preferred =
          data.channels.find(
            (channel) =>
              channel.countryCode === "FR" &&
              channel.kind === "hls" &&
              channel.isSecure &&
              !channel.isGeoBlocked,
          ) ??
          data.channels.find((channel) => channel.kind === "hls" && channel.isSecure) ??
          data.channels.find((channel) => channel.kind === "hls") ??
          null;
        setSelected(preferred);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Le catalogue est indisponible.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchRef.current) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Numéro de chaîne stable : position dans le catalogue, comme une télécommande.
  const numbers = useMemo(
    () => new Map(channels.map((channel, index) => [channel.id, index + 1])),
    [channels],
  );

  const countries = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    channels.forEach((channel) => {
      const key = channel.countryCode || channel.group;
      const current = counts.get(key);
      counts.set(key, { label: channel.country, count: (current?.count ?? 0) + 1 });
    });
    return Array.from(counts, ([code, value]) => ({ code, ...value })).sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  }, [channels]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return channels.filter((channel) => {
      const countryKey = channel.countryCode || channel.group;
      const matchesCountry = country === "TOUS" || countryKey === country;
      const matchesQuery =
        !normalizedQuery ||
        `${channel.cleanName} ${channel.country} ${channel.group}`
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      return matchesCountry && matchesQuery;
    });
  }, [channels, country, query]);

  const resetFilters = () => {
    setCountry("TOUS");
    setQuery("");
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="FREE TV, accueil">
          <span className="brand-mark" aria-hidden="true">
            <Tv size={18} />
          </span>
          FREE TV
        </Link>
        <nav className="topnav" aria-label="Navigation principale">
          <Link href="/" aria-current="page">
            <Tv size={16} aria-hidden="true" />
            <span>Chaînes</span>
          </Link>
          <a href="https://github.com/Free-TV/IPTV" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <span>Source</span>
          </a>
        </nav>
      </header>

      <main className="layout">
        <section className="stage" aria-label="Lecteur">
          <VideoPlayer channel={selected} number={selected ? numbers.get(selected.id) : undefined} />
        </section>

        <aside className="guide" aria-label="Guide des chaînes">
          <div className="guide-head">
            <div className="guide-title">
              <h2>Chaînes</h2>
              <span>{loading ? "Chargement…" : `${filtered.length} sur ${channels.length}`}</span>
            </div>

            <label className="search">
              <span className="sr-only">Rechercher une chaîne ou un pays</span>
              <Search aria-hidden="true" size={18} />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(PAGE_SIZE);
                }}
                placeholder="Rechercher une chaîne ou un pays"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setQuery("")}
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              ) : (
                <kbd aria-hidden="true">/</kbd>
              )}
            </label>

            <label>
              <span className="sr-only">Filtrer par pays</span>
              <select
                className="select"
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setVisible(PAGE_SIZE);
                }}
              >
                <option value="TOUS">Tous les pays ({channels.length})</option>
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="channel-list" aria-busy={loading}>
            {loading &&
              Array.from({ length: 8 }, (_, index) => (
                <div className="skeleton-row" key={index} aria-hidden="true" />
              ))}

            {error && (
              <div className="guide-state" role="alert">
                <strong>Catalogue indisponible</strong>
                <p>{error}</p>
                <Button onClick={() => window.location.reload()}>Recharger</Button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="guide-state">
                <strong>Aucune chaîne trouvée</strong>
                <p>Essayez un autre nom ou un autre pays.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Effacer les filtres
                </Button>
              </div>
            )}

            {filtered.slice(0, visible).map((channel) => {
              const isActive = selected?.id === channel.id;
              return (
                <button
                  type="button"
                  className="channel-row"
                  data-active={isActive || undefined}
                  aria-current={isActive || undefined}
                  key={channel.id}
                  onClick={() => setSelected(channel)}
                >
                  <ChannelLogo channel={channel} />
                  <span className="channel-text">
                    <strong>{channel.cleanName}</strong>
                    <small>
                      <span className="channel-number">{numbers.get(channel.id)}</span> · {channel.country}
                    </small>
                  </span>
                  <span className="row-tags">
                    {channel.isGeoBlocked && (
                      <span className="tag tag-region" title="Disponible seulement dans son pays de diffusion">
                        Région
                      </span>
                    )}
                    {channel.kind !== "hls" && <span className="tag">{FORMAT_LABELS[channel.kind]}</span>}
                  </span>
                </button>
              );
            })}

            {filtered.length > visible && (
              <div className="load-more">
                <Button variant="secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                  Afficher plus ({filtered.length - visible} restantes)
                </Button>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="footer">
        <p>
          FREE TV n’héberge aucun flux : droits et disponibilité relèvent de chaque diffuseur.
          {updatedAt &&
            ` Catalogue mis à jour à ${new Date(updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}.`}
        </p>
      </footer>
    </div>
  );
}
