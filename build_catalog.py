import json, os, re, csv, hashlib
from pathlib import Path
ROOT=Path(__file__).parent
src=json.load(open(ROOT/'docs/source/master_gallery.json',encoding='utf8'))
prod=[]; assets=[]
hexes={'Black':'#170000','Cream':'#eee7d9','Maroon':'#692c37','Chocolate Brown':'#503225'}
for p in src['product_catalog']:
  item={k:p.get(k) for k in ['id','name','collection','editorial','price_bdt','copy_en','copy_bn','front_back_detail','tags','featured','rights_assessment','rights_verified','stock_verified','commercial_terms_verified','publication_status','size_chart','fabric_claim','third_party_ip_review']}
  item['slug']=re.sub(r'[^a-z0-9]+','-',p['name'].lower()).strip('-')
  item['drive_folder_url']=p.get('drive_folder_url','')
  item['variants']=[]
  for v in p['variants']:
    if v['sku'][:8]!=p['id'][:8]:raise ValueError(v)
    gallery=[]
    for g in v.get('gallery',[]):
      path='assets/images/'+Path(g['local_file']).name
      if not (ROOT/path).is_file():raise FileNotFoundError(path)
      gallery.append({'view':g['view'],'url':'/'+path,'drive_reference_url':g['drive_view_url'],'filename':Path(path).name})
      assets.append({'product_id':p['id'],'sku':v['sku'],'view':g['view'],'path':path,'drive_reference_url':g['drive_view_url'],'bytes':os.stat(ROOT/path).st_size})
    item['variants'].append({'sku':v['sku'],'color':v['color'],'hex':hexes.get(v['color'],'#333333'),'gallery':gallery,'stock_quantity':v.get('stock_quantity'),'available_sizes':v.get('sizes',[]),'approved_for_publication':v.get('approved_for_publication',False)})
  prod.append(item)
assert len(prod)==11 and sum(len(x['variants']) for x in prod)==15 and len(assets)==67
assert len({a['path'] for a in assets})==67
assert all(not x['rights_verified'] for x in prod)
(ROOT/'assets/js/catalog-data.js').write_text('window.STARKIT_CATALOG = '+json.dumps(prod,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
(ROOT/'assets/catalog.json').write_text(json.dumps({'brand':'StarkiT','tagline':'WEAR YOUR WORLD.','products':prod},ensure_ascii=False,indent=2),encoding='utf8')
with open(ROOT/'docs/MEDIA_MANIFEST.csv','w',newline='',encoding='utf-8-sig') as fp:
 w=csv.DictWriter(fp,fieldnames=list(assets[0]));w.writeheader();w.writerows(assets)
with open(ROOT/'docs/PRODUCT_MASTER.csv','w',newline='',encoding='utf-8-sig') as fp:
 w=csv.writer(fp);w.writerow(['product_id','sku','name','collection','price_bdt','color','rights_verified','stock_verified','sizes_verified','publication_status','drive_folder_url'])
 for p in prod:
  for v in p['variants']:
   w.writerow([p['id'],v['sku'],p['name'],p['collection'],p['price_bdt'],v['color'],p['rights_verified'],p['stock_verified'],bool(v['available_sizes']),p['publication_status'],p['drive_folder_url']])
print('Catalog',len(prod),'variants',sum(map(lambda x:len(x['variants']),prod)),'files',len(assets))
