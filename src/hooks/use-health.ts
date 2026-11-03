"use client";

import { useEffect, useState } from "react";

import type { HealthReport } from "@/lib/health-report";

const POLL_WHILE_RUNNING_MS = 15_000;
const POLL_IDLE_MS = 10 * 60 * 1000;

// Rapport de disponibilité des flux, rafraîchi plus souvent tant que le contrôle tourne.
export function useHealth() {
  const [report, setReport] = useState<HealthReport | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const controller = new AbortController();

    const load = async () => {
      let next: HealthReport | null = null;
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        if (response.ok) next = (await response.json()) as HealthReport;
      } catch {
        if (controller.signal.aborted) return;
      }
      if (next) setReport(next);
      const delay = !next || next.running || !next.checkedAt ? POLL_WHILE_RUNNING_MS : POLL_IDLE_MS;
      timer = window.setTimeout(load, delay);
    };

    void load();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return report;
}
