"""Offline integrity checks for the StarkiT Drop 01 Hoodies storefront (Python stdlib only)."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re

R = Path(__file__).resolve().parent


class TagAuditParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_count = 0
        self.urls: list[str] = []
        self.unsafe_blank_links: list[str] = []
        self.inline_events: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == 'title':
            self.title_count += 1
        if tag in ('img', 'script', 'link', 'a'):
            key = 'href' if tag in ('a', 'link') else 'src'
            val = attr_map.get(key)
            if val:
                self.urls.append(val)
        if tag == 'a' and attr_map.get('target') == '_blank':
            rel = (attr_map.get('rel') or '').lower()
            if 'noopener' not in rel:
                self.unsafe_blank_links.append(attr_map.get('href') or '')
        for name, _ in attrs:
            if name and name.lower().startswith('on'):
                self.inline_events.append((tag, name))


def read_json(rel_path: str) -> dict:
    with (R / rel_path).open('r', encoding='utf8') as fh:
        return json.load(fh)


def main() -> None:
    catalog_doc = read_json('assets/catalog.json')
    catalog = catalog_doc['products']
    hoodies = [p for p in catalog if str(p.get('id', '')).startswith('STK-')]
    accessories = [p for p in catalog if str(p.get('id', '')).startswith('FT-')]

    assert len(catalog) == 11, f'Expected 11 Drop 01 hoodies, found {len(catalog)}'
    assert len(hoodies) == 11, f'Expected 11 STK hoodies, found {len(hoodies)}'
    assert len(accessories) == 0, f'Expected 0 FT accessories, found {len(accessories)}'
    assert not any(p['id'] == 'STK-H012' for p in hoodies), 'STK-H012 must remain excluded'

    hoodie_variants = [v for p in hoodies for v in p['variants']]
    assert len(hoodie_variants) == 15, f'Expected 15 hoodie variants, found {len(hoodie_variants)}'
    assert len({v['sku'] for v in hoodie_variants}) == 15

    documented = [v for v in hoodie_variants if v['status'] == 'DOCUMENTED']
    provisional = [v for v in hoodie_variants if v['status'] == 'PROVISIONAL']
    assert len(documented) == 15, f'Expected 15 documented variants, found {len(documented)}'
    assert len(provisional) == 0, f'Expected 0 provisional variants, found {len(provisional)}'

    tier_prices = {1099, 1250, 1369, 1499}
    assert all(p['price_bdt'] in tier_prices for p in hoodies), 'Unexpected hoodie tier price'

    webp_dir = R / 'assets/images'
    files = {p.name for p in webp_dir.glob('*.webp')}
    expected_webps: list[str] = []

    for p in hoodies:
        assert (R / f"products/{p['slug']}.html").is_file(), p['slug']
        for v in p['variants']:
            assert v['sku'].startswith(p['id'])
            assert v.get('approved_for_publication') is True, f"Documented SKU {v['sku']} must be approved_for_publication"
            assert len(v['gallery']) > 0, f"Missing gallery on documented variant {v['sku']}"
            for image in v['gallery']:
                fn = image['filename']
                expected_webps.append(fn)
                img_path = webp_dir / fn
                assert img_path.is_file(), fn
                with img_path.open('rb') as fh:
                    header = fh.read(16)
                    fh.seek(0, 2)
                    size = fh.tell()
                assert size >= 1000, f'WebP too small: {fn}'
                assert header[:4] == b'RIFF' and header[8:12] == b'WEBP', f'Invalid WebP header: {fn}'

    assert len(expected_webps) == 67 and len(set(expected_webps)) == 67
    assert set(expected_webps) == files, 'Unused or missing WebP asset in assets/images'

    ref_jpgs = list((R / 'docs/original_references').glob('*.jpg'))
    assert len(ref_jpgs) == 13, f'Expected 13 reference JPGs, found {len(ref_jpgs)}'
    for jpg in ref_jpgs:
        with jpg.open('rb') as fh:
            sig = fh.read(3)
        assert sig == b'\xff\xd8\xff', f'Invalid JPEG header: {jpg.name}'

    fb_config = read_json('firebase-applet-config.json')
    assert fb_config.get('apiKey', None) == '', 'firebase-applet-config.json apiKey must be empty'
    fb_raw = json.dumps(fb_config)
    assert not re.search(r'AIza[0-9A-Za-z_-]{20,}', fb_raw), 'Potential leaked Google API key in firebase-applet-config.json'

    required_files = [
        'index.html', 'shop.html', 'checkout.html', 'order-confirmation.html', 'admin.html',
        'server.js', 'vercel.json', 'api/orders.js', 'api/admin.js', 'firebase-applet-config.json',
        'supabase/001_starkit_store.sql', 'supabase/002_catalog_seed.sql',
        'supabase/003_admin_views_and_helpers.sql', 'supabase/004_quick_enable_demo.sql',
        'supabase/005_security_and_60_variant_upgrade.sql', 'supabase/seed.sql',
        'assets/js/catalog-data.js', 'assets/js/core/runtime-store.js', 'assets/css/styles.css',
        'assets/js/modules/order-confirmation.js', 'assets/js/drive-sync.js',
    ]
    missing_req = [x for x in required_files if not (R / x).exists()]
    assert not missing_req, f'Missing required files: {missing_req}'

    htmlfiles = sorted(list(R.glob('*.html')) + list((R / 'products').glob('*.html')))
    assert len(htmlfiles) == 22, f'Expected 22 HTML files, found {len(htmlfiles)}'

    missing_links: list[tuple[str, str]] = []
    unsafe_links: list[tuple[str, str]] = []
    inline_handlers: list[tuple[str, str, str]] = []

    for f in htmlfiles:
        with f.open('r', encoding='utf8') as fh:
            raw = fh.read()
        parser = TagAuditParser()
        parser.feed(raw)
        assert parser.title_count == 1, f'Expected single <title> in {f}'
        assert '1390081606323661' in raw, f'Missing Meta Pixel in {f}'
        assert 'Afacad+Flux' in raw or 'Afacad Flux' in raw, f'Missing Afacad Flux in {f}'

        rel_name = str(f.relative_to(R))
        for href in parser.unsafe_blank_links:
            unsafe_links.append((rel_name, href))
        for tag, attr_name in parser.inline_events:
            inline_handlers.append((rel_name, tag, attr_name))

        for url in parser.urls:
            if url.startswith(('https://', 'http://', '#', 'mailto:', 'tel:', 'data:', 'javascript:', '${')):
                continue
            target = (f.parent / url.split('#', 1)[0].split('?', 1)[0]).resolve()
            if not target.exists():
                missing_links.append((rel_name, url))

    assert not missing_links, f'Broken local paths: {missing_links}'
    assert not unsafe_links, f'target=_blank without noopener: {unsafe_links}'
    assert not inline_handlers, f'Inline DOM event handlers found: {inline_handlers}'

    print('PASS: 22 HTML pages / 11 Drop 01 hoodies / 15 DOCUMENTED SKUs / 67 WebP images / 13 reference JPGs.')
    print('PASS: Zero broken links, zero inline event handlers, zero unsafe target=_blank links, clean Firebase config.')


if __name__ == '__main__':
    main()
