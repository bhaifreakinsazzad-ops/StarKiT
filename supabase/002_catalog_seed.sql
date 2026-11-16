-- Initial public.store_variants seed. Does NOT overwrite existing approvals, prices or stock.
begin;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H001-CRM','STK-H001','SHINOBI SUNSET','Cream',1590) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H001-BLK','STK-H001','SHINOBI SUNSET','Black',1590) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H002-BLK','STK-H002','PEACE BRO CLUB','Black',1290) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H003-BLK','STK-H003','FOLK ROUTE','Black',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H004-MRN','STK-H004','THE RIDER CODE','Maroon',1690) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H005-BLK','STK-H005','MOONLIT HERO','Black',1590) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H006-BLK','STK-H006','CELLULOID NIGHTS','Black',1490) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H007-BRN','STK-H007','DHAKA AFTERGLOW','Chocolate Brown',1490) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H008-BLK','STK-H008','COLLECTIVE VOICE','Black',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H008-MRN','STK-H008','COLLECTIVE VOICE','Maroon',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H008-BRN','STK-H008','COLLECTIVE VOICE','Chocolate Brown',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H008-CRM','STK-H008','COLLECTIVE VOICE','Cream',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H009-BLK','STK-H009','RICKSHAW BLOOM','Black',1490) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H010-BLK','STK-H010','CHEESE CHASE','Black',1390) on conflict(sku) do nothing;
insert into public.store_variants(sku,product_id,product_name,color,price_bdt) values('STK-H011-BLK','STK-H011','NIGHT CIRCUIT','Black',1590) on conflict(sku) do nothing;
commit;
