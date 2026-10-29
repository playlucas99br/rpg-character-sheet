"use client";
import { useEffect, useRef, useState } from "react";
import type { Campaign, Sheet } from "./types";
import { EMPTY_ACTIVITY, parseActivity, rememberVisit, type RecentActivity } from "./recent-activity";

export function useRecentActivity(
  key: string,
  route: { page: string; id?: string },
  campaigns: Campaign[],
  sheets: Sheet[],
  userId: string,
  ready: boolean,
) {
  const cache = useRef<{ key: string; activity: RecentActivity } | null>(null);
  const [stored, setStored] = useState<typeof cache.current>(null);
  useEffect(() => {
    let previous = cache.current?.key === key ? cache.current.activity : EMPTY_ACTIVITY;
    if (cache.current?.key !== key) {
      try { previous = parseActivity(localStorage.getItem(key)); } catch {}
    }
    const activity = ready ? rememberVisit(previous, { page: route.page, id: route.id }, campaigns, sheets, userId) : previous;
    const next = { key, activity };
    cache.current = next;
    setStored(next);
    if (activity !== previous) {
      try { localStorage.setItem(key, JSON.stringify(activity)); } catch {}
    }
  }, [key, route.page, route.id, campaigns, sheets, userId, ready]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      const next = { key, activity: parseActivity(event.newValue) };
      cache.current = next;
      setStored(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  return stored?.key === key ? stored.activity : EMPTY_ACTIVITY;
}
