-- StarkiT Store Administrator Views and Evidence-Verified Approval Helpers
-- Replaces blind approval toggles with strict evidence-gated transitions.

-- 1. Administrative view of all customer orders with line-item summaries
create or replace view public.v_starkit_orders_dashboard as
select
  o.id,
  o.reference,
  o.customer_name,
  o.customer_phone,
  o.shipping_address,
  o.district,
  o.zone,
  o.notes,
  o.subtotal_bdt,
  coalesce(o.discount_bdt, 0) as discount_bdt,
  o.shipping_bdt,
  o.total_bdt,
  coalesce(o.applied_promotions, '[]'::jsonb) as applied_promotions,
  o.status,
  o.created_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sku', i.sku,
        'product_name', i.product_name,
        'color', i.color,
        'size', i.size,
        'quantity', i.quantity,
        'unit_price_bdt', i.unit_price_bdt,
        'line_total_bdt', i.line_total_bdt
      ) order by i.id
    ) filter (where i.id is not null),
    '[]'::jsonb
  ) as items,
  count(i.id) as total_items_count
from public.store_orders o
left join public.store_order_items i on o.id = i.order_id
group by o.id
order by o.created_at desc;

-- 2. Stored function to update order status with audit log write
create or replace function public.update_starkit_order_status(
  p_reference text,
  p_new_status text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order_id uuid;
  v_old_status text;
begin
  if p_new_status not in ('pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Invalid status value: %', p_new_status using errcode = 'P0001';
  end if;

  select id, status into v_order_id, v_old_status
  from public.store_orders
  where reference = p_reference;

  if not found then
    raise exception 'Order reference % not found', p_reference using errcode = 'P0001';
  end if;

  update public.store_orders
  set status = p_new_status
  where id = v_order_id;

  if to_regclass('public.store_audit_logs') is not null then
    insert into public.store_audit_logs (actor, auth_method, action, target_type, target_id, details)
    values (
      'db_helper',
      'service_role',
      'update_order_status',
      'order',
      p_reference,
      jsonb_build_object('previous_status', v_old_status, 'new_status', p_new_status)
    );
  end if;

  return jsonb_build_object(
    'reference', p_reference,
    'previous_status', v_old_status,
    'current_status', p_new_status,
    'updated_at', now()
  );
end $$;

-- 3. Evidence-Gated SKU Approval (replaces blind force-publish helper)
-- Requires an explicit verified evidence record in store_product_approvals before publishing.
create or replace function public.starkit_publish_sku(
  p_sku text,
  p_sizes jsonb,
  p_initial_stock int
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_variant public.store_variants%rowtype;
  v_approval record;
  v_media_count int := 0;
begin
  if jsonb_typeof(p_sizes) <> 'array' or jsonb_array_length(p_sizes) < 1 then
    raise exception 'Sizes must be a non-empty JSONB array' using errcode = 'P0001';
  end if;

  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'Stock must be a non-negative integer' using errcode = 'P0001';
  end if;

  select * into v_variant from public.store_variants where sku = p_sku for update;
  if not found then
    raise exception 'SKU % not found in catalog', p_sku using errcode = 'P0001';
  end if;

  if v_variant.status <> 'DOCUMENTED' then
    raise exception 'SKU % is PROVISIONAL and lacks documented media', p_sku using errcode = 'P0001';
  end if;

  if to_regclass('public.store_media_assets') is not null then
    select count(*) into v_media_count from public.store_media_assets where sku = p_sku;
  end if;

  if to_regclass('public.store_product_approvals') is null then
    raise exception 'Evidence table store_product_approvals is required. Run migration 005 first.' using errcode = 'P0001';
  end if;

  select * into v_approval
  from public.store_product_approvals
  where product_id = v_variant.product_id;

  if not found
     or not v_approval.artwork_rights_ok
     or not v_approval.garment_specs_ok
     or not v_approval.sample_photo_ok
     or not v_approval.size_run_ok
     or not v_approval.stock_count_ok
     or not v_approval.pricing_approved_ok
     or not v_approval.commercial_terms_ok
  then
    raise exception 'Approval blocked for %: all 7 evidence gates must be verified in store_product_approvals first.', p_sku using errcode = 'P0001';
  end if;

  update public.store_variants
  set
    sizes = p_sizes,
    stock_quantity = p_initial_stock,
    rights_verified = true,
    specifications_verified = true,
    stock_verified = (p_initial_stock > 0),
    commercial_terms_verified = true,
    approved_for_publication = (p_initial_stock > 0),
    updated_at = now()
  where sku = p_sku;

  return jsonb_build_object(
    'sku', p_sku,
    'sizes', p_sizes,
    'stock_quantity', p_initial_stock,
    'media_assets_recorded', v_media_count,
    'status', case when p_initial_stock > 0 then 'PUBLISHED_AND_ACTIVE' else 'APPROVED_ZERO_STOCK' end
  );
end $$;

revoke all on view public.v_starkit_orders_dashboard from public, anon, authenticated;
grant select on view public.v_starkit_orders_dashboard to service_role;
grant execute on function public.update_starkit_order_status(text, text) to service_role;
grant execute on function public.starkit_publish_sku(text, jsonb, int) to service_role;
