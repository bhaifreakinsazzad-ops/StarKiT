# QA report — StarkiT DROP 01 preview

Validation performed 2026-11-17.

## Passed checks

- 20 local static HTML pages are generated (home, shop, checkout, six informational pages and 11 individual products).
- 11 distinct products / 15 color SKU variants / 67 unique WebP files.
- All 67 WebP images open successfully with the Pillow image decoder.
- 13 source JPG references are present.
- All local page links, scripts, stylesheet, logos and static image paths resolve in the package.
- JavaScript syntax check completed with Node.js.
- Headless Chromium DOM test completed using inlined versions of the distributable HTML, CSS, JavaScript and media assets. This workaround was necessary because the testing environment blocked direct localhost/file URL navigation.
- DOM test found no JavaScript page errors on the four primary templates at desktop and mobile widths.
- Home and shop dynamically rendered 11 product cards.
- Bangla Heritage filtering reduced 11 products to three; searching within it for 'rickshaw' returned one.
- Shinobi Sunset displayed 2 color selectors and correctly switched SKU to STK-H001-BLK with 6 gallery views.
- Collective Voice displayed 4 color selectors.
- Checkout starts disabled in preview mode and does not falsely claim to have received an order.
- Contact/source folder ID for Peace Bro Club confirmed independently in Drive to contain its three expected images.

## Not yet verified

- A live Supabase transaction has NOT been executed; Supabase connection details were not provided.
- Production deploy and live domain were NOT performed or verified.
- Server-side COD function was syntax checked, but not integration-tested against an actual deployed database.
- Real payment service and shipping policies are not configured.
- Third-party artwork rights, actual sizes, garment specifications, inventory and support phone have not been independently confirmed.
- Automated accessibility auditing and performance benchmarks for a real deployed URL were not completed.

## Publication status

**Technically complete preview package. Commercial orders remain disabled until verified operational, inventory and legal requirements are satisfied.**
