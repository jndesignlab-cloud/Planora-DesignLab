window.PLANORA_CONFIG = Object.freeze({
  APP_NAME: "Planora",
  VERSION: "0.2.0",

  SUPABASE_URL: "https://ntggfbcqkkwsvwskdbka.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_hFr1ZAOO2OJjv5KJW1wT7A_c5TJLR2U",

  // For the current GitHub Pages deployment.
  // Change this to https://planora.madebydesignlab.com/login.html
  // after the custom domain is active.
  SITE_URL: "https://jndesignlab-cloud.github.io/Planora-DesignLab/login.html",

  TIME_ZONE: "Asia/Manila",
  REQUIRE_EMAIL_CONFIRMATION: true,
  DEFAULT_VIEW: "monthly",
  AUTO_REFRESH_MS: 60000,

  CHANGELOG: [
    {
      version: "0.2.0",
      date: "2026-07-17",
      changes: [
        "Added a public Planora product landing page with features, workflow, plans, and FAQs.",
        "Moved account access and the planner application to login.html.",
        "Added Privacy Policy and Terms of Use pages for public beta and OAuth branding.",
        "Added launch-ready SEO metadata and structured application data."
      ]
    },
    {
      version: "0.1.1",
      date: "2026-07-17",
      changes: [
        "Fixed password-recovery links opening the planner instead of the new-password form.",
        "Added an explicit recovery redirect marker and safer auth-event handling.",
        "Cleaned the recovery URL after a successful password update."
      ]
    },
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
