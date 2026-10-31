-- Add Spotify to integration_connections and integration_sync_items check constraints

alter table public.integration_connections
  drop constraint if exists integration_connections_provider_check;

alter table public.integration_connections
  add constraint integration_connections_provider_check
  check (provider in ('google_calendar', 'slack', 'github', 'linear', 'spotify'));

alter table public.integration_sync_items
  drop constraint if exists integration_sync_items_provider_check;

alter table public.integration_sync_items
  add constraint integration_sync_items_provider_check
  check (provider in ('google_calendar', 'slack', 'github', 'linear', 'spotify'));
