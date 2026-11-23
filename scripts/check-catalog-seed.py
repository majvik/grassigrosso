"""Check that the bundled Strapi seed and public snapshots ship the same catalog."""
import json
import sqlite3
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
seed = root / "strapi-catalog/database/seed/data.db"
with sqlite3.connect(f"{seed.as_uri()}?mode=ro", uri=True) as db:
    actual = Counter(row[0] for row in db.execute("SELECT slug FROM products WHERE is_active = 1"))
    davos_media = dict(db.execute("""
        SELECT l.field, f.url FROM files_related_mph l JOIN files f ON f.id = l.file_id
        JOIN products p ON p.id = l.related_id
        WHERE l.related_type = 'api::product.product' AND p.slug = 'davos'
          AND l.field IN ('media', 'page_cover_desktop', 'page_cover_mobile')
    """))
    for field in ('media', 'page_cover_desktop', 'page_cover_mobile'):
        url = davos_media.get(field, '')
        if not url.startswith('/uploads/RELAX_Davos_canonical_') or not (root / 'strapi-catalog/public' / url.lstrip('/')).is_file():
            raise SystemExit(f'Davos has no saved canonical media for {field}: {url}')
for name in ("catalog-products.snapshot.json", "catalog-products-listing.snapshot.json"):
    items = json.loads((root / "public" / name).read_text())["items"]
    expected = Counter(item["slug"] for item in items)
    if actual != expected:
        raise SystemExit(f"{name}: extra {dict(actual - expected)}, missing {dict(expected - actual)}")
print(f"Seed matches both catalog snapshots ({actual.total()} active products)")
