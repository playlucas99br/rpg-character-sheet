"use client";
import { useEffect } from "react";
import { browserSupabase } from "../auth/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const ASSETS_CHANGED_EVENT = "nexo:assets-changed";
export function useCampaignRealtime(enabled: boolean, accountId: string | undefined, campaignKey: string, refresh: () => Promise<void>) {
  useEffect(() => {
    if (!enabled || !accountId?.startsWith("supabase:")) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dispose = () => {};
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (stopped || document.visibilityState !== "visible") return;
        void refresh();
        window.dispatchEvent(new Event(ASSETS_CHANGED_EVENT));
      }, 250);
    };
    void (async () => {
      const client = await browserSupabase();
      const { data } = await client.auth.getSession();
      if (stopped || `supabase:${data.session?.user.id}` !== accountId) return;
      await client.realtime.setAuth(data.session!.access_token);
      if (stopped) return;
      const channels: RealtimeChannel[] = [];
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (`supabase:${session?.user.id}` !== accountId && !stopped) {
          stopped = true;
          channels.forEach((channel) => { void client.removeChannel(channel); });
          window.location.reload();
        }
      });
      dispose = () => {
        listener.subscription.unsubscribe();
        channels.forEach((channel) => { void client.removeChannel(channel); });
      };
      for (const id of JSON.parse(campaignKey) as string[]) {
        channels.push(client.channel(`nexo:campaign:${id}`, { config: { private: true } })
          .on("broadcast", { event: "invalidate" }, invalidate)
          .subscribe((status) => { if (status === "SUBSCRIBED") invalidate(); }));
      }
    })().catch(() => { /* Periodic authenticated refresh remains the fallback. */ });
    return () => { stopped = true; clearTimeout(timer); dispose(); };
  }, [enabled, accountId, campaignKey, refresh]);
}
