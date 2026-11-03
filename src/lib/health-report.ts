// Types et calculs purs, partagés entre le serveur et le navigateur.
export type ChannelHealth = "online" | "blocked" | "offline";

export type HealthReport = {
  /** Fin du dernier contrôle complet, ou null tant qu'aucun n'est terminé. */
  checkedAt: string | null;
  running: boolean;
  checked: number;
  total: number;
  results: Record<string, ChannelHealth>;
};

// 403 et 451 : le diffuseur répond mais refuse ce pays, ce n'est pas une panne.
export function classifyProbe(status: number, bodyStart: string): ChannelHealth {
  if (status === 403 || status === 451) return "blocked";
  if (status >= 200 && status < 300 && bodyStart.trimStart().startsWith("#EXTM3U")) return "online";
  return "offline";
}

export function summarizeHealth(results: Record<string, ChannelHealth>) {
  const summary: Record<ChannelHealth, number> = { online: 0, blocked: 0, offline: 0 };
  for (const status of Object.values(results)) summary[status] += 1;
  return summary;
}
