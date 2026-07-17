# Changelog

## 0.1.1 — 2026-07-17

- Fixed password-reset links opening the authenticated planner instead of the recovery form.
- Added an explicit `mode=recovery` redirect marker for reset emails.
- Prevented the initial session check from racing ahead of the `PASSWORD_RECOVERY` event.
- Cleans recovery parameters from the URL after a successful password update.

# Planora Changelog

## Version 0.1.0 — July 17, 2026

- Added Supabase email/password registration and sign-in.
- Added email confirmation and password recovery flows.
- Added persistent authenticated sessions and protected planner access.
- Connected profiles, workspaces, social pages, and posts to Supabase.
- Added monthly and weekly planner views.
- Added drag-and-drop rescheduling while preserving the selected posting time.
- Added time shortcuts, search, status filtering, quick status updates, and automatic time sorting.
- Added social page creation, editing, color coding, and archiving.
- Added Realtime updates with timed and focus-based refresh fallback.
- Added manual Hide Week / Show Week controls in monthly view.
- Added Free/Premium account badges and a Premium feature preview.
- Added account and workspace profile settings.
