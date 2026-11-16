"""Offline integrity checks for the StarkiT storefront distributable."""
from pathlib import Path
from collections import Counter
import json,re,csv,sys
from PIL import Image
from bs4 import BeautifulSoup
R=Path(__file__).parent
catalog=json.loads((R/'assets/catalog.json').read_text(encoding='utf8'))['products']
variants=[v for p in catalog for v in p['variants']]
files={p.name for p in (R/'assets/images').glob('*.webp')}
assert len(catalog)==11, 'product count mismatch'
assert len(variants)==15 and len(set(v['sku'] for v in variants))==15
assert all(1290<=p['price_bdt']<=1690 for p in catalog)
expected=[]
for p in catalog:
 assert (R/f"products/{p['slug']}.html").is_file(),p['slug']
 assert p['rights_verified'] is False, 'unexpected rights approval'
 for v in p['variants']:
  assert not v['available_sizes'] and v['stock_quantity'] is None
  assert v['sku'].startswith(p['id'])
  for image in v['gallery']:
   filename=image['filename'];expected.append(filename)
   assert (R/'assets/images'/filename).is_file(),filename
   with Image.open(R/'assets/images'/filename) as im:im.verify()
assert len(expected)==67 and len(set(expected))==67
assert set(expected)==files, 'unused asset or missing image'
assert len(list((R/'docs/original_references').glob('*.jpg')))==13
assert all((R/x).exists() for x in ['index.html','shop.html','checkout.html','api/orders.js','supabase/001_starkit_store.sql','supabase/002_catalog_seed.sql','assets/js/catalog-data.js','assets/css/styles.css'])
htmlfiles=list(R.glob('*.html'))+list((R/'products').glob('*.html'))
assert len(htmlfiles)==20, len(htmlfiles)
missing=[];pages=[]
for f in htmlfiles:
 doc=BeautifulSoup(f.read_text(encoding='utf8'),'html.parser')
 assert len(doc.find_all('title'))==1,f
 for tag in doc.find_all(['img','script','link','a']):
  attr='href' if tag.name in ('a','link') else 'src'
  url=tag.get(attr)
  if not url or url.startswith(('https://','http://','#','mailto:','tel:','data:','javascript:')):continue
  full=(f.parent/url.split('#',1)[0].split('?',1)[0]).resolve()
  if not full.exists():missing.append((f.relative_to(R),url))
 pages.append(f.relative_to(R).as_posix())
assert not missing,'broken paths: '+str(missing)
assert 'state.cart = []' not in (R/'assets/js/app.js').read_text(),'cart cleared without confirmation'
print('PASS: 20 HTML pages / 11 products / 15 SKUs / 67 verified WebP images / 13 original JPG references.')
print('PASS: Local links and media resolution, unique SKU IDs, proposed prices, preview-only commercial gates.')
print('PASS: Required Vercel/Supabase project files present.')
