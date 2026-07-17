# Planora by DesignLab

**Version 0.1.1**

Planora is the account-based Supabase edition of the DesignLab Social Media Planner. It is a static GitHub Pages frontend backed by Supabase Authentication, PostgreSQL, Row Level Security, and Realtime.

## Live URL

`https://jndesignlab-cloud.github.io/Planora-DesignLab/`

## Included Features

- Account registration and sign-in
- Email confirmation
- Forgot and reset password
- Persistent sessions and logout
- Automatic personal workspace creation
- Social page management
- Monthly and weekly calendar views
- Drag-and-drop date changes
- Manual time input with five-minute increments
- Quick time shortcuts and “Now” option
- Automatic sorting by posting time
- Quick status cycling
- Search and status filtering
- Manual Hide Week / Show Week controls
- Supabase Realtime updates
- 60-second refresh fallback
- Refresh on tab focus
- Account and workspace settings
- Free/Premium plan foundation
- Responsive DesignLab interface

## Project Structure

```text
Planora-v0.1.1/
├── index.html
├── style.css
├── config.js
├── supabase-client.js
├── app.js
├── auth.js
├── favicon.svg
├── .nojekyll
├── README.md
├── CHANGELOG.md
├── SECURITY.md
├── LICENSE
└── database/
    ├── 001_initial_schema.sql
    ├── 002_security_hardening.sql
    ├── 003_realtime_social_pages.sql
    └── verify_setup.sql
```

## GitHub Pages Setup

1. Upload the contents of this folder to the root of `jndesignlab-cloud/Planora-DesignLab`.
2. Open repository **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose branch `main` and folder `/root`.
5. Save and wait for GitHub Pages to publish.

## Supabase Authentication URLs

In Supabase, open **Authentication → URL Configuration**.

Set the Site URL to:

`https://jndesignlab-cloud.github.io/Planora-DesignLab/`

Add this Redirect URL:

`https://jndesignlab-cloud.github.io/Planora-DesignLab/**`

For local testing, also add one of these when needed:

- `http://localhost:5500/**`
- `http://127.0.0.1:5500/**`

## Supabase Configuration

The project URL and browser-safe publishable key are stored in `config.js`. The publishable key is expected to be visible in a static frontend. Security is enforced by PostgreSQL Row Level Security and table privileges.

Never place a Supabase secret key, service-role key, database password, or connection string in this repository.

## Local Testing

Do not open `index.html` directly using a `file://` URL. Run a local web server:

```bash
python -m http.server 5500
```

Then visit:

`http://localhost:5500/`

## Database

The SQL migrations in `database/` are included for reference and rebuilding. They match the schema used by the app:

- `profiles`
- `workspaces`
- `workspace_members`
- `social_pages`
- `posts`

The current release expects the initial schema and security hardening migrations to have already been run in Supabase. Run `database/003_realtime_social_pages.sql` once to enable instant page-list updates; post Realtime was already enabled by the original migration.

## Current Plan Behavior

The database contains `free`, `premium`, and `admin` plan values. Version 0.1.1 displays and reads the account plan, but automated billing and server-enforced usage limits are intentionally reserved for a later migration.

## Keyboard Shortcuts

- `N` — create a new post
- `R` — refresh the planner
- `W` — weekly view
- `M` — monthly view

Shortcuts are ignored while typing or while a modal is open.


## Password recovery

Password-reset emails return users to Planora with `mode=recovery`. The app keeps the temporary recovery session on the reset form until the new password is saved.
