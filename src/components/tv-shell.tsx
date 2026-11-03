"use client";

import { ExternalLink, Search, TvMinimalPlay, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video-player";
import type { Channel } from "@/lib/channels";

type CatalogResponse = {
  channels: Channel[];
  updatedAt?: string;
  error?: string;
};

const DISPLAY_LIMIT = 140;

const FORMAT_LABELS: Record<Channel["kind"], string> = {
  hls: "HLS",
  youtube: "YT",
  dailymotion: "DM",
  twitch: "TW",
  external: "LIEN",
};

function pageCode(index: number) {
  return `P${String(100 + (index % 900)).padStart(3, "0")}`;
}

export function TvShell() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("TOUS");
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
            (channel) => channel.countryCode === "FR" && channel.kind === "hls" && channel.isSecure,
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

  return (
    <main className="broadcast-shell">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="FREE TV, accueil">
          <span>FREE</span>
          <strong>TV</strong>
        </a>
        <div className="masthead-copy">
          <p>INDEX DE DIFFUSION PUBLIQUE</p>
          <span>{channels.length ? `${channels.length} CHAÎNES RÉFÉRENCÉES` : "CHARGEMENT DU RÉSEAU"}</span>
        </div>
        <a
          className="source-link"
          href="https://github.com/Free-TV/IPTV"
          target="_blank"
          rel="noreferrer"
        >
          SOURCE <ExternalLink size={15} />
        </a>
      </header>

      <div className="ticker" aria-label="Informations de service">
        <span>● SERVICE PERSONNEL</span>
        <p>Les flux restent hébergés par leurs diffuseurs · disponibilité selon la région</p>
        <time>
          {updatedAt
            ? `MAJ ${new Date(updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}`
            : "MAJ —:—"}
        </time>
      </div>

      <div className="workspace" id="top">
        <aside className="channel-index" aria-label="Index des chaînes">
          <div className="index-title">
            <div>
              <h2>CHAÎNES</h2>
              <p>{filtered.length} résultats · / pour chercher</p>
            </div>
            <TvMinimalPlay aria-hidden="true" />
          </div>

          <label className="search-field">
            <span className="sr-only">Rechercher une chaîne ou un pays</span>
            <Search aria-hidden="true" size={18} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="CHAÎNE OU PAYS"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche">
                <X size={17} />
              </button>
            )}
          </label>

          <label className="country-field">
            <span>PAYS</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="TOUS">TOUS LES PAYS ({channels.length})</option>
              {countries.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label.toUpperCase()} ({item.count})
                </option>
              ))}
            </select>
          </label>

          <div className="channel-list" aria-busy={loading}>
            {loading &&
              Array.from({ length: 8 }, (_, index) => (
                <div className="channel-skeleton" key={index} aria-hidden="true" />
              ))}

            {error && (
              <div className="index-state error-state" role="alert">
                <strong>CATALOGUE HORS LIGNE</strong>
                <p>{error}</p>
                <Button onClick={() => window.location.reload()}>Recharger</Button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="index-state">
                <strong>AUCUN SIGNAL TROUVÉ</strong>
                <p>Modifiez le pays ou la recherche.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCountry("TOUS");
                    setQuery("");
                  }}
                >
                  Effacer les filtres
                </Button>
              </div>
            )}

            {filtered.slice(0, DISPLAY_LIMIT).map((channel) => {
              const absoluteIndex = channels.findIndex((item) => item.id === channel.id);
              const isActive = selected?.id === channel.id;
              return (
                <button
                  type="button"
                  className="channel-row"
                  data-active={isActive || undefined}
                  aria-pressed={isActive}
                  key={channel.id}
                  onClick={() => setSelected(channel)}
                >
                  <span className="page-code">{pageCode(absoluteIndex)}</span>
                  <span className="channel-name">
                    <strong>{channel.cleanName}</strong>
                    <small>{channel.country}</small>
                  </span>
                  <span className={`format-tag format-${channel.kind}`}>
                    {FORMAT_LABELS[channel.kind]}
                  </span>
                </button>
              );
            })}

            {filtered.length > DISPLAY_LIMIT && (
              <p className="result-limit">
                {DISPLAY_LIMIT} résultats affichés sur {filtered.length}. Affinez la recherche.
              </p>
            )}
          </div>
        </aside>

        <VideoPlayer channel={selected} />
      </div>

      <footer className="service-footer">
        <p>FREE TV n’héberge aucun flux. Les droits et la disponibilité relèvent de chaque source.</p>
        <span>VERSION 0.1 · USAGE PERSONNEL</span>
      </footer>
    </main>
  );
}
