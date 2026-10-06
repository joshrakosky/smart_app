-- Temporary prototype orders. Remove this data before go-live.
-- Prices are per unit. The summary view applies quantity and the 3% card fee.
-- Each product's owner stakeholder receives that line's net Smart$.

insert into public.stakeholders (id, name)
overriding system value
values
  (1, 'MarCom'),
  (2, 'Tours'),
  (3, 'FSR'),
  (4, 'Elite Dealer Service');

select setval(pg_get_serial_sequence('public.stakeholders', 'id'), 4, true);

insert into public.products (id, sku, name, stakeholder_id)
overriding system value
values
  (1, 'BR-8PG', 'Trane Brochure', 1),
  (2, 'PS-2436', 'Dealer Poster', 1),
  (3, 'SS-SPEC', 'Product Spec Sheet', 2),
  (4, 'CC-TENT', 'Counter Card', 2),
  (5, 'BN-STAND', 'Banner Stand', 3),
  (6, 'LF-FOLD', 'Leave-Behind Folder', 3),
  (7, 'HM-MAIL', 'Holiday Mailer', 4),
  (8, 'CF-COOP', 'Co-op Flyer', 4);

select setval(pg_get_serial_sequence('public.products', 'id'), 8, true);

insert into public.order_lines (
  order_number,
  ordered_on,
  product_id,
  quantity,
  unit_print_cost,
  unit_wholesale,
  unit_retail,
  fee_rate
)
values
  ('ORD-1041', '2026-09-02', 1, 500, 1.20, 2.40, 3.10, 0.0300),
  ('ORD-1041', '2026-09-03', 2, 40, 4.50, 8.00, 10.50, 0.0300),
  ('ORD-1048', '2026-09-05', 3, 1000, 0.35, 0.75, 1.05, 0.0300),
  ('ORD-1048', '2026-09-05', 4, 250, 0.80, 1.60, 2.25, 0.0300),
  ('ORD-1055', '2026-09-08', 5, 6, 28.00, 45.00, 62.00, 0.0300),
  ('ORD-1055', '2026-09-09', 6, 300, 1.10, 2.20, 3.00, 0.0300),
  ('ORD-1062', '2026-09-11', 7, 800, 0.55, 1.15, 1.70, 0.0300),
  ('ORD-1062', '2026-09-12', 8, 600, 0.40, 0.90, 1.30, 0.0300),
  ('ORD-1070', '2026-09-15', 1, 200, 1.20, 2.40, 3.10, 0.0300),
  ('ORD-1074', '2026-09-16', 3, 400, 0.35, 0.75, 1.05, 0.0300),
  ('ORD-1081', '2026-09-18', 5, 2, 28.00, 45.00, 62.00, 0.0300),
  ('ORD-1088', '2026-09-19', 7, 250, 0.55, 1.15, 1.70, 0.0300),
  ('ORD-1093', '2026-09-22', 2, 15, 4.50, 8.00, 10.50, 0.0300),
  ('ORD-1099', '2026-09-24', 6, 120, 1.10, 2.20, 3.00, 0.0300),
  ('ORD-1104', '2026-09-26', 4, 100, 0.80, 1.60, 2.25, 0.0300);
