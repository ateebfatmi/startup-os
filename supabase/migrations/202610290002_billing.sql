-- Workspace billing state synchronized from Stripe webhooks.

create table public.workspace_billing (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','cancelled','unpaid')),
  seats integer not null default 1 check (seats > 0),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_billing enable row level security;
create policy "admins read workspace billing" on public.workspace_billing for select
  using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create index workspace_billing_customer_idx on public.workspace_billing(stripe_customer_id);
