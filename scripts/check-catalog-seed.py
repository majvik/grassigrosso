"""Check that the bundled Strapi seed and public snapshots ship the same catalog."""
import json
import sqlite3
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
seed = root / "strapi-catalog/database/seed/data.db"
with sqlite3.connect(f"{seed.as_uri()}?mode=ro", uri=True) as db:
    actual = Counter(row[0] for row in db.execute("SELECT slug FROM products WHERE is_active = 1"))
    davos_id = db.execute("SELECT id FROM products WHERE slug = 'davos'").fetchone()[0]
    davos_product_media = db.execute(
        "SELECT COUNT(*) FROM files_related_mph WHERE related_type = 'api::product.product' AND related_id = ? AND field IN ('media', 'page_characteristics_media', 'page_cover_desktop', 'page_cover_mobile')",
        (davos_id,),
    ).fetchone()[0]
    davos_product_components = db.execute(
        "SELECT COUNT(*) FROM products_cmps WHERE entity_id = ? AND field IN ('gallery', 'page_materials')",
        (davos_id,),
    ).fetchone()[0]
    if davos_product_media or davos_product_components:
        raise SystemExit(
            f"Davos seed must not contain temporary media: media={davos_product_media}, components={davos_product_components}"
        )
for name in ("catalog-products.snapshot.json", "catalog-products-listing.snapshot.json"):
    items = json.loads((root / "public" / name).read_text())["items"]
    expected = Counter(item["slug"] for item in items)
    if actual != expected:
        raise SystemExit(f"{name}: extra {dict(actual - expected)}, missing {dict(expected - actual)}")
print(f"Seed matches both catalog snapshots ({actual.total()} active products)")
