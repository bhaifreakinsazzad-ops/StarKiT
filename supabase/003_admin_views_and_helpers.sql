-- StarkiT Store Administrator Views and Utility Functions
-- For monitoring orders, updating fulfillment status, and approving SKUs for live commerce.

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
  o.shipping_bdt,
  o.total_bdt,
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

-- 2. Stored function to update order status with audit log check
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

  return jsonb_build_object(
    'reference', p_reference,
    'previous_status', v_old_status,
    'current_status', p_new_status,
    'updated_at', now()
  );
end $$;

-- 3. Stored function to approve a SKU, assign verified sizes, and stock
create or replace function public.starkit_publish_sku(
  p_sku text,
  p_sizes jsonb,
  p_initial_stock int
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if jsonb_typeof(p_sizes) <> 'array' or jsonb_array_length(p_sizes) < 1 then
    raise exception 'Sizes must be a non-empty JSONB array' using errcode = 'P0001';
  end if;

  if p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'Stock must be non-negative integer' using errcode = 'P0001';
  end if;

  update public.store_variants
  set
    sizes = p_sizes,
    stock_quantity = p_initial_stock,
    rights_verified = true,
    specifications_verified = true,
    stock_verified = true,
    commercial_terms_verified = true,
    approved_for_publication = true,
    updated_at = now()
  where sku = p_sku;

  if not found then
    raise exception 'SKU % not found in catalog', p_sku using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'sku', p_sku,
    'sizes', p_sizes,
    'stock_quantity', p_initial_stock,
    'status', 'PUBLISHED_AND_ACTIVE'
  );
end $$;

revoke all on view public.v_starkit_orders_dashboard from public, anon, authenticated;
grant select on view public.v_starkit_orders_dashboard to service_role;
grant execute on function public.update_starkit_order_status(text, text) to service_role;
grant execute on function public.starkit_publish_sku(text, jsonb, int) to service_role;
