# Security Notes

## Safe for the Browser

`SUPABASE_URL` and the `sb_publishable_...` key in `config.js` are browser-facing values. They do not grant unrestricted database access by themselves.

## Never Commit

Do not add any of these to GitHub:

- Supabase `service_role` key
- Supabase secret key
- Database password
- Direct or pooled database connection string
- SMTP credentials
- Payment provider secret keys

## Database Protection

Planora depends on all exposed tables having Row Level Security enabled and appropriate policies. It also uses restricted table and column privileges so normal users cannot directly edit their plan value, workspace ownership, creator identity, or audit timestamps.

## Premium Enforcement

Visual feature hiding is not sufficient security. Premium usage limits and paid entitlements must eventually be enforced in PostgreSQL functions, triggers, policies, or a trusted server/Edge Function.
