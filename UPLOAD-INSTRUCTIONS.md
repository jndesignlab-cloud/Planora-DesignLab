# Planora v0.2.0 — Landing Page Update

Upload these files to the root of the `jndesignlab-cloud/Planora-DesignLab` repository.

## Replace
- `index.html`
- `config.js`

## Add
- `login.html`
- `landing.css`
- `privacy.html`
- `terms.html`
- `robots.txt`
- `sitemap.xml`

Keep all current application files:
- `style.css`
- `app.js`
- `auth.js`
- `supabase-client.js`
- `favicon.svg`

## Important Supabase update

Because the login and planner now live at `login.html`, open:

Supabase → Authentication → URL Configuration

For the current GitHub Pages deployment, add this Redirect URL:

`https://jndesignlab-cloud.github.io/Planora-DesignLab/login.html`

You may keep the old root URL temporarily during migration.

After `planora.madebydesignlab.com` is connected, update `config.js`:

`SITE_URL: "https://planora.madebydesignlab.com/login.html"`

Then set the Supabase Site URL to:

`https://planora.madebydesignlab.com/login.html`

And add the same exact URL to Redirect URLs.

## Page structure

- `/` — Planora product landing page
- `/login.html` — account registration, login, password recovery, and planner app
- `/privacy.html` — public beta privacy policy
- `/terms.html` — public beta terms

## Note

The policies are practical launch-ready beta drafts, not jurisdiction-specific legal advice.
