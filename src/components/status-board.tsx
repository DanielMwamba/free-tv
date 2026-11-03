"use client";

import { useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { useHealth } from "@/hooks/use-health";
import type { Channel } from "@/lib/channels";
import { summarizeHealth, type ChannelHealth } from "@/lib/health-report";

type CountryRow = { key: string; label: string } & Record<ChannelHealth | "total", number>;

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function StatusBoard() {
  const health = useHealth();
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/channels", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { channels: [] }))
      .then((data: { channels: Channel[] }) => setChannels(data.channels))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => summarizeHealth(health?.results ?? {}), [health]);
  const embedded = channels.filter((channel) => channel.kind !== "hls").length;

  const rows = useMemo(() => {
    const byCountry = new Map<string, CountryRow>();
    for (const channel of channels) {
      const status = health?.results[channel.id];
      if (!status) continue;
      const key = channel.countryCode || channel.group;
      const row = byCountry.get(key) ?? {
        key,
        label: channel.country,
        total: 0,
        online: 0,
        blocked: 0,
        offline: 0,
      };
      row.total += 1;
      row[status] += 1;
      byCountry.set(key, row);
    }
    return [...byCountry.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [channels, health]);

  return (
    <div className="app">
      <SiteHeader current="status" />
      <main className="status-page">
        <div className="status-intro">
          <h1>État du service</h1>
          <p>
            Le serveur interroge chaque flux HLS du catalogue toutes les heures, depuis son propre pays.
            Un flux « refusé » répond mais n’est pas diffusé dans ce pays ; il peut fonctionner ailleurs.
          </p>
          <p className="status-meta" role="status">
            {!health
              ? "Chargement du rapport…"
              : health.running
                ? `Contrôle en cours : ${health.checked} flux sur ${health.total}.`
                : health.checkedAt
                  ? `Dernier contrôle : ${DATE_FORMAT.format(new Date(health.checkedAt))}.`
                  : "Aucun contrôle terminé pour le moment."}
          </p>
        </div>

        <dl className="status-cards">
          <div data-health="online">
            <dt>En ligne</dt>
            <dd>{summary.online}</dd>
          </div>
          <div data-health="blocked">
            <dt>Refusés dans ce pays</dt>
            <dd>{summary.blocked}</dd>
          </div>
          <div data-health="offline">
            <dt>Injoignables</dt>
            <dd>{summary.offline}</dd>
          </div>
          <div>
            <dt>Lecteurs intégrés (non contrôlés)</dt>
            <dd>{embedded}</dd>
          </div>
        </dl>

        {rows.length > 0 && (
          <div className="status-table-wrap">
            <table className="status-table">
              <caption className="sr-only">Disponibilité des flux par pays</caption>
              <thead>
                <tr>
                  <th scope="col">Pays</th>
                  <th scope="col">En ligne</th>
                  <th scope="col">Refusés</th>
                  <th scope="col">Injoignables</th>
                  <th scope="col">Disponibilité</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ratio = Math.round((row.online / row.total) * 100);
                  return (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      <td>{row.online}</td>
                      <td>{row.blocked}</td>
                      <td>{row.offline}</td>
                      <td>
                        <span className="meter" aria-hidden="true">
                          <span style={{ width: `${ratio}%` }} />
                        </span>
                        {ratio} %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
