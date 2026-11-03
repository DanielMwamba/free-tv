"use client";

import { useCallback, useSyncExternalStore } from "react";

import { readIds, writeIds } from "@/lib/library";

const CHANGE_EVENT = "freetv:storage";
const EMPTY: string[] = [];
const snapshots = new Map<string, { raw: string | null; ids: string[] }>();

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getSnapshot(key: string) {
  let raw: string | null = null;
  try {
    raw = getStorage()?.getItem(key) ?? null;
  } catch {
    raw = null;
  }
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.ids;
  const ids = readIds(getStorage(), key);
  snapshots.set(key, { raw, ids });
  return ids;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Liste d'identifiants persistée dans localStorage et synchronisée entre onglets.
export function useStoredIds(key: string) {
  const ids = useSyncExternalStore(subscribe, () => getSnapshot(key), () => EMPTY);
  const update = useCallback(
    (next: (current: string[]) => string[]) => {
      writeIds(getStorage(), key, next(getSnapshot(key)));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );
  return [ids, update] as const;
}
