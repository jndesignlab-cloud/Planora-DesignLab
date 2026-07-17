-- Optional but recommended for instant social-page updates across open sessions.
do $$
begin
  alter publication supabase_realtime add table public.social_pages;
exception
  when duplicate_object then null;
end
$$;
