"""Offline integrity checks for the StarkiT canonical 60-slot Drop 01 + 35-item Drop 02 storefront."""
from pathlib import Path
import json
from PIL import Image
from bs4 import BeautifulSoup

R = Path(__file__).parent
catalog = json.loads((R / 'assets/catalog.json').read_text(encoding='utf8'))['products']
hoodies = [p for p in catalog if str(p.get('id', '')).startswith('STK-')]
accessories = [p for p in catalog if str(p.get('id', '')).startswith('FT-')]

assert len(catalog) == 50, f'Expected 50 master designs, found {len(catalog)}'
assert len(hoodies) == 15, f'Expected 15 Drop 01 hoodies, found {len(hoodies)}'
assert len(accessories) == 35, f'Expected 35 Drop 02 accessories, found {len(accessories)}'
assert not any(p['id'] == 'STK-H012' for p in hoodies), 'STK-H012 must remain excluded/held'

hoodie_variants = [v for p in hoodies for v in p['variants']]
assert len(hoodie_variants) == 60, f'Expected 60 hoodie variant slots, found {len(hoodie_variants)}'
assert len({v['sku'] for v in hoodie_variants}) == 60

documented = [v for v in hoodie_variants if v['status'] == 'DOCUMENTED']
provisional = [v for v in hoodie_variants if v['status'] == 'PROVISIONAL']
assert len(documented) == 15, f'Expected 15 documented hoodie variants, found {len(documented)}'
assert len(provisional) == 45, f'Expected 45 provisional hoodie variants, found {len(provisional)}'

tier_prices = {1099, 1250, 1369, 1499}
assert all(p['price_bdt'] in tier_prices for p in hoodies), 'Unexpected hoodie tier price'

files = {p.name for p in (R / 'assets/images').glob('*.webp')}
expected_webps = []
for p in hoodies:
    assert (R / f"products/{p['slug']}.html").is_file(), p['slug']
    for v in p['variants']:
        assert v['sku'].startswith(p['id'])
        if v['status'] == 'PROVISIONAL':
            assert not v['available_sizes'] and v['stock_quantity'] == 0
            assert v['approved_for_publication'] is False
            assert len(v['gallery']) == 0
        else:
            assert v['approved_for_publication'] is False
            for image in v['gallery']:
                fn = image['filename']
                expected_webps.append(fn)
                img_path = R / 'assets/images' / fn
                assert img_path.is_file(), fn
                with Image.open(img_path) as im:
                    im.verify()

for a in accessories:
    assert (R / f"products/{a['slug']}.html").is_file(), a['slug']
    for v in a['variants']:
        for image in v['gallery']:
            assert (R / 'assets/images/accessories' / image['filename']).is_file(), image['filename']

assert len(expected_webps) == 67 and len(set(expected_webps)) == 67
assert set(expected_webps) == files, 'Unused or missing WebP asset in assets/images'
assert len(list((R / 'docs/original_references').glob('*.jpg'))) == 13
assert len(list((R / 'assets/images/accessories').glob('*.jpg'))) == 35

required_files = [
    'index.html', 'shop.html', 'checkout.html', 'order-confirmation.html', 'admin.html',
    'server.js', 'vercel.json', 'api/orders.js', 'api/admin.js',
    'supabase/001_starkit_store.sql', 'supabase/002_catalog_seed.sql',
    'supabase/003_admin_views_and_helpers.sql', 'supabase/004_quick_enable_demo.sql',
    'supabase/005_security_and_60_variant_upgrade.sql', 'supabase/seed.sql',
    'assets/js/catalog-data.js', 'assets/js/core/runtime-store.js', 'assets/css/styles.css'
]
assert all((R / x).exists() for x in required_files)

htmlfiles = list(R.glob('*.html')) + list((R / 'products').glob('*.html'))
assert len(htmlfiles) == 61, f'Expected 61 HTML files, found {len(htmlfiles)}'

missing = []
for f in htmlfiles:
    raw = f.read_text(encoding='utf8')
    doc = BeautifulSoup(raw, 'html.parser')
    assert len(doc.find_all('title')) == 1, f
    assert '1390081606323661' in raw, f'Missing Meta Pixel in {f}'
    assert 'Afacad+Flux' in raw or 'Afacad Flux' in raw, f'Missing Afacad Flux in {f}'
    for tag in doc.find_all(['img', 'script', 'link', 'a']):
        attr = 'href' if tag.name in ('a', 'link') else 'src'
        url = tag.get(attr)
        if not url or url.startswith(('https://', 'http://', '#', 'mailto:', 'tel:', 'data:', 'javascript:', '${')):
            continue
        full = (f.parent / url.split('#', 1)[0].split('?', 1)[0]).resolve()
        if not full.exists():
            missing.append((f.relative_to(R), url))

assert not missing, 'Broken local paths: ' + str(missing)
print('PASS: 61 HTML pages / 50 designs (15 hoodies + 35 accessories) / 60 hoodie slots / 67 WebP images / 35 accessory JPGs / 13 reference JPGs.')
print('PASS: Local links, Meta Pixel, 4-tier draft pricing, and fail-closed approval gates verified.')
