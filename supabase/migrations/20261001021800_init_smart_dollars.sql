-- Smart$ crawl schema.
-- Each product has one owner stakeholder. That owner receives the net Smart$
-- on every order line for the product:
--   gross = (retail - wholesale) * quantity
--   fee   = round(retail * quantity * fee_rate, 2)
--   net   = gross - fee
-- Print cost is stored for the later ERP import. It does not change allocation.
-- Spent stays 0 until a later pass tracks using the funds to pay for printing.
--
-- The anon SELECT policies are temporary so the dashboard can read before
-- logins exist. Replace them with auth-scoped policies when auth arrives.

create table public.stakeholders (
  id bigint generated always as identity primary key,
  name text not null unique constraint stakeholders_name_not_blank check (length(btrim(name)) > 0)
);

comment on table public.stakeholders is
  'Budget owners. v1: MarCom, Tours, FSR, Elite Dealer Service.';

create table public.products (
  id bigint generated always as identity primary key,
  sku text not null unique constraint products_sku_not_blank check (length(btrim(sku)) > 0),
  name text not null constraint products_name_not_blank check (length(btrim(name)) > 0),
  -- Owner who receives net Smart$ for every order of this product.
  stakeholder_id bigint not null references public.stakeholders (id)
);

comment on table public.products is
  'Marketing collateral. stakeholder_id is the owner of the Smart$ from this product.';

create index products_stakeholder_id_idx on public.products (stakeholder_id);

create table public.order_lines (
  id bigint generated always as identity primary key,
  order_number text not null constraint order_lines_order_number_not_blank check (length(btrim(order_number)) > 0),
  ordered_on date not null,
  product_id bigint not null references public.products (id),
  quantity integer not null constraint order_lines_quantity_positive check (quantity > 0),
  unit_print_cost numeric(12, 2) not null constraint order_lines_print_cost_nonnegative check (unit_print_cost >= 0),
  unit_wholesale numeric(12, 2) not null constraint order_lines_wholesale_nonnegative check (unit_wholesale >= 0),
  unit_retail numeric(12, 2) not null constraint order_lines_retail_nonnegative check (unit_retail >= 0),
  -- Card fee as a fraction of extended retail. Seed data uses 0.0300 (3%).
  fee_rate numeric(6, 4) not null default 0.0300 constraint order_lines_fee_rate_range check (fee_rate >= 0 and fee_rate < 1),
  constraint order_lines_retail_covers_wholesale check (unit_retail >= unit_wholesale)
);

comment on table public.order_lines is
  'One ordered collateral line. Prices are per unit; the summary view extends them by quantity.';

create index order_lines_product_id_idx on public.order_lines (product_id);
create index order_lines_ordered_on_idx on public.order_lines (ordered_on desc);

alter table public.stakeholders enable row level security;
alter table public.products enable row level security;
alter table public.order_lines enable row level security;

-- Temporary crawl policies: any anon or logged-in caller can read.
-- There is no write policy, so the browser key cannot insert or update.
create policy stakeholders_select_prototype
  on public.stakeholders
  for select
  to anon, authenticated
  using (true);

create policy products_select_prototype
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy order_lines_select_prototype
  on public.order_lines
  for select
  to anon, authenticated
  using (true);

-- security_invoker so RLS on the base tables still applies to the caller.
-- Keeps the money formula in one place for the dashboard.
create view public.order_line_summary
with (security_invoker = true) as
select
  ol.id,
  ol.order_number,
  ol.ordered_on,
  ol.quantity,
  p.sku,
  p.name as product_name,
  s.id as stakeholder_id,
  s.name as stakeholder_name,
  ol.unit_print_cost,
  ol.unit_wholesale,
  ol.unit_retail,
  ol.fee_rate,
  (ol.unit_print_cost * ol.quantity) as print_cost_total,
  (ol.unit_wholesale * ol.quantity) as wholesale_total,
  (ol.unit_retail * ol.quantity) as retail_total,
  ((ol.unit_retail - ol.unit_wholesale) * ol.quantity) as gross_smart,
  round((ol.unit_retail * ol.quantity) * ol.fee_rate, 2) as fee_amount,
  round(
    ((ol.unit_retail - ol.unit_wholesale) * ol.quantity)
      - round((ol.unit_retail * ol.quantity) * ol.fee_rate, 2),
    2
  ) as net_smart
from public.order_lines ol
join public.products p on p.id = ol.product_id
join public.stakeholders s on s.id = p.stakeholder_id;

comment on view public.order_line_summary is
  'Line totals. Net Smart$ is gross margin minus the card fee, owed to the product owner.';

-- Available equals net allocated while spent is still zero.
create view public.stakeholder_budgets
with (security_invoker = true) as
select
  s.id as stakeholder_id,
  s.name as stakeholder_name,
  coalesce(sum(ols.net_smart), 0)::numeric(12, 2) as net_allocated,
  0::numeric(12, 2) as spent,
  coalesce(sum(ols.net_smart), 0)::numeric(12, 2) as available
from public.stakeholders s
left join public.order_line_summary ols on ols.stakeholder_id = s.id
group by s.id, s.name;

comment on view public.stakeholder_budgets is
  'Budget snapshot per stakeholder. spent is 0 until funds are used for the next print run.';

-- Default Supabase grants are broad. Read-only is enough for this prototype.
revoke all on table public.stakeholders from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
revoke all on table public.order_lines from public, anon, authenticated;
revoke all on table public.order_line_summary from public, anon, authenticated;
revoke all on table public.stakeholder_budgets from public, anon, authenticated;

grant select on table public.stakeholders to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.order_lines to anon, authenticated;
grant select on table public.order_line_summary to anon, authenticated;
grant select on table public.stakeholder_budgets to anon, authenticated;
