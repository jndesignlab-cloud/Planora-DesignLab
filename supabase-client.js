(() => {
  "use strict";

  const config = window.PLANORA_CONFIG;

  if (!config) {
    throw new Error("PLANORA_CONFIG is missing. Load config.js before supabase-client.js.");
  }

  if (!window.supabase?.createClient) {
    throw new Error("Supabase JS did not load from the CDN.");
  }

  const url = String(config.SUPABASE_URL || "").trim();
  const key = String(config.SUPABASE_PUBLISHABLE_KEY || "").trim();

  if (!url || !key) {
    throw new Error("Supabase URL or publishable key is missing in config.js.");
  }

  window.planoraSupabase = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    },
    realtime: {
      params: {
        eventsPerSecond: 5
      }
    }
  });
})();
