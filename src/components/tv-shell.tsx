"use client";

import { Search, Star, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChannelLogo } from "@/components/channel-logo";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { VideoPlayer } from "@/components/video-player";
import { useHealth } from "@/hooks/use-health";
import { useStoredIds } from "@/hooks/use-stored-ids";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";
import type { Channel } from "@/lib/channels";
import type { ChannelHealth } from "@/lib/health-report";
import { FAVORITES_KEY, RECENTS_KEY, pushRecent, toggleId } from "@/lib/library";
import {
  appendDigit,
  channelAtNumber,
  isShortcutIgnored,
  readSharedChannelId,
  stepChannel,
  withSharedChannel,
} from "@/lib/zapping";

type CatalogResponse = {
  channels: Channel[];
  updatedAt?: string;
  error?: string;
};

const PAGE_SIZE = 80;

const HEALTH_LABELS: Record<ChannelHealth, string> = {
  online: "Flux en ligne au dernier contrôle",
  blocked: "Flux refusé depuis ce pays au dernier contrôle",
  offline: "Flux injoignable au dernier contrôle",
};
const NUMBER_ENTRY_DELAY = 1500;
const OSD_DURATION = 2500;

type GuideView = "all" | "favorites" | "recents";

const VIEW_LABELS: Record<GuideView, string> = {
  all: "Toutes",
  favorites: "Favoris",
  recents: "Récents",
};

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
  const [view, setView] = useState<GuideView>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [category, setCategory] = useState<Category | "all">("all");
  const health = useHealth();
  const [favorites, setFavorites] = useStoredIds(FAVORITES_KEY);
  const [recents, setRecents] = useStoredIds(RECENTS_KEY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [numberEntry, setNumberEntry] = useState("");
  const [osd, setOsd] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const numberTimer = useRef<number | undefined>(undefined);
  const osdTimer = useRef<number | undefined>(undefined);

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
        const sharedId = readSharedChannelId(window.location.search);
        const preferred =
          data.channels.find((channel) => channel.id === sharedId) ??
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

  const byId = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    const source =
      view === "all"
        ? channels
        : (view === "favorites" ? favorites : recents)
            .map((id) => byId.get(id))
            .filter((channel): channel is Channel => channel !== undefined);
    return source.filter((channel) => {
      const countryKey = channel.countryCode || channel.group;
      const matchesCountry = country === "TOUS" || countryKey === country;
      const matchesQuery =
        !normalizedQuery ||
        `${channel.cleanName} ${channel.country} ${channel.group}`
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      const matchesHealth = !onlyAvailable || health?.results[channel.id] === "online";
      const matchesCategory = category === "all" || channel.category === category;
      return matchesCountry && matchesQuery && matchesHealth && matchesCategory;
    });
  }, [byId, category, channels, country, favorites, health, onlyAvailable, query, recents, view]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const channel of channels) counts.set(channel.category, (counts.get(channel.category) ?? 0) + 1);
    return counts;
  }, [channels]);

  const showOsd = useCallback((message: string) => {
    window.clearTimeout(osdTimer.current);
    setOsd(message);
    osdTimer.current = window.setTimeout(() => setOsd(null), OSD_DURATION);
  }, []);

  const selectChannel = useCallback(
    (channel: Channel) => {
      setSelected(channel);
      setRecents((current) => pushRecent(current, channel.id));
      // Lien partageable sans recharger ni empiler l'historique.
      window.history.replaceState(null, "", withSharedChannel(window.location.href, channel.id));
    },
    [setRecents],
  );

  const tuneTo = useCallback(
    (channel: Channel | null) => {
      if (!channel) return;
      selectChannel(channel);
      showOsd(`${numbers.get(channel.id)} · ${channel.cleanName}`);
    },
    [numbers, selectChannel, showOsd],
  );

  useEffect(() => {
    const commitNumber = (value: string) => {
      window.clearTimeout(numberTimer.current);
      setNumberEntry("");
      const channel = channelAtNumber(channels, value);
      if (channel) tuneTo(channel);
      else if (value) showOsd(`Aucune chaîne ${value}`);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isShortcutIgnored(event)) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "PageDown" || event.key === "ChannelDown") {
        event.preventDefault();
        tuneTo(stepChannel(filtered, selected?.id, 1));
      } else if (event.key === "PageUp" || event.key === "ChannelUp") {
        event.preventDefault();
        tuneTo(stepChannel(filtered, selected?.id, -1));
      } else if (/^\d$/.test(event.key)) {
        event.preventDefault();
        const next = appendDigit(numberEntry, event.key);
        setNumberEntry(next);
        window.clearTimeout(numberTimer.current);
        if (next) numberTimer.current = window.setTimeout(() => commitNumber(next), NUMBER_ENTRY_DELAY);
      } else if (event.key === "Enter" && numberEntry) {
        event.preventDefault();
        commitNumber(numberEntry);
      } else if (event.key === "Escape" && numberEntry) {
        window.clearTimeout(numberTimer.current);
        setNumberEntry("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [channels, filtered, numberEntry, selected, showOsd, tuneTo]);

  useEffect(() => {
    document
      .querySelector<HTMLElement>('.channel-row[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const toggleFavorite = (channel: Channel) => setFavorites((current) => toggleId(current, channel.id));

  const resetFilters = () => {
    setCountry("TOUS");
    setQuery("");
    setOnlyAvailable(false);
    setCategory("all");
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="app">
      <SiteHeader current="channels" />

      <main className="layout">
        <section className="stage" aria-label="Lecteur">
          <VideoPlayer
            osd={numberEntry ? `Chaîne ${numberEntry}_` : osd}
            channel={selected}
            number={selected ? numbers.get(selected.id) : undefined}
            isFavorite={selected ? favorites.includes(selected.id) : false}
            onToggleFavorite={() => selected && toggleFavorite(selected)}
          />
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

            <div className="chips" role="group" aria-label="Catégories">
              {(["all", ...Object.keys(CATEGORY_LABELS)] as (Category | "all")[])
                .filter((item) => item === "all" || categoryCounts.has(item))
                .map((item) => (
                  <button
                    type="button"
                    key={item}
                    className="chip"
                    aria-pressed={category === item}
                    onClick={() => {
                      setCategory(item);
                      setVisible(PAGE_SIZE);
                    }}
                  >
                    {item === "all" ? "Tout" : CATEGORY_LABELS[item]}
                  </button>
                ))}
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={onlyAvailable}
                disabled={!health?.checkedAt && !health?.checked}
                onChange={(event) => {
                  setOnlyAvailable(event.target.checked);
                  setVisible(PAGE_SIZE);
                }}
              />
              <span className="switch-track" aria-hidden="true" />
              <span>Disponibles maintenant</span>
              <small>
                {!health
                  ? "Contrôle…"
                  : health.running
                    ? `Contrôle ${health.checked}/${health.total}`
                    : `${Object.values(health.results).filter((status) => status === "online").length} en ligne`}
              </small>
            </label>

            <div className="segmented" role="group" aria-label="Affichage du guide">
              {(Object.keys(VIEW_LABELS) as GuideView[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={view === item}
                  onClick={() => {
                    setView(item);
                    setVisible(PAGE_SIZE);
                  }}
                >
                  {VIEW_LABELS[item]}
                  {item === "favorites" && favorites.length > 0 && <span>{favorites.length}</span>}
                </button>
              ))}
            </div>
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
                {view === "favorites" && favorites.length === 0 ? (
                  <>
                    <strong>Aucun favori</strong>
                    <p>Touchez l’étoile d’une chaîne pour la retrouver ici.</p>
                  </>
                ) : view === "recents" && recents.length === 0 ? (
                  <>
                    <strong>Aucune chaîne récente</strong>
                    <p>Les dernières chaînes regardées apparaîtront ici.</p>
                  </>
                ) : (
                  <>
                    <strong>Aucune chaîne trouvée</strong>
                    <p>Essayez un autre nom ou un autre pays.</p>
                    <Button variant="outline" onClick={resetFilters}>
                      Effacer les filtres
                    </Button>
                  </>
                )}
              </div>
            )}

            {filtered.slice(0, visible).map((channel) => {
              const isActive = selected?.id === channel.id;
              const isFavorite = favorites.includes(channel.id);
              return (
                <div className="channel-item" key={channel.id}>
                  <button
                    type="button"
                    className="channel-row"
                    data-active={isActive || undefined}
                    aria-current={isActive || undefined}
                    onClick={() => selectChannel(channel)}
                  >
                    <ChannelLogo channel={channel} />
                    <span className="channel-text">
                      <strong>{channel.cleanName}</strong>
                      <small>
                        {health?.results[channel.id] && (
                          <span
                            className="health-dot"
                            data-health={health.results[channel.id]}
                            title={HEALTH_LABELS[health.results[channel.id]]}
                          >
                            <span className="sr-only">{HEALTH_LABELS[health.results[channel.id]]}. </span>
                          </span>
                        )}
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
                  <button
                    type="button"
                    className="favorite-toggle"
                    aria-pressed={isFavorite}
                    aria-label={
                      isFavorite
                        ? `Retirer ${channel.cleanName} des favoris`
                        : `Ajouter ${channel.cleanName} aux favoris`
                    }
                    onClick={() => toggleFavorite(channel)}
                  >
                    <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
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
          Raccourcis : <kbd>/</kbd> rechercher · <kbd>Page ↑</kbd> <kbd>Page ↓</kbd> chaîne précédente
          ou suivante · chiffres puis <kbd>Entrée</kbd> pour aller à un numéro · <kbd>F</kbd> mode TV.
        </p>
        <p>
          FREE TV n’héberge aucun flux : droits et disponibilité relèvent de chaque diffuseur.
          {updatedAt &&
            ` Catalogue mis à jour à ${new Date(updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}.`}
        </p>
      </footer>
    </div>
  );
}
