window.PLANORA_CONFIG = Object.freeze({
  APP_NAME: "Planora",
  VERSION: "0.1.0",

  SUPABASE_URL: "https://ntggfbcqkkwsvwskdbka.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_hFr1ZAOO2OJjv5KJW1wT7A_c5TJLR2U",

  SITE_URL: "https://jndesignlab-cloud.github.io/Planora-DesignLab/",
  TIME_ZONE: "Asia/Manila",
  REQUIRE_EMAIL_CONFIRMATION: true,
  DEFAULT_VIEW: "monthly",
  AUTO_REFRESH_MS: 60000,

  CHANGELOG: [
    {
      version: "0.1.0",
      date: "2026-07-17",
      changes: [
        "Added account registration, email confirmation, sign in, sign out, and password recovery.",
        "Connected Planora to Supabase profiles, workspaces, social pages, and posts.",
        "Added monthly and weekly planner views with drag-and-drop rescheduling.",
        "Added Realtime updates with a timed and focus-based refresh fallback.",
        "Added social page management, quick status controls, search, and filters.",
        "Added Free and Premium account structure for future paid features."
      ]
    }
  ]
});
